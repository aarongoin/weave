<style scoped>

	div {
		margin-top: 3rem;
		padding-top: 1.5rem;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		align-items: stretch;
	}

	.noteHead {
		font-size: 1.7rem;
		margin: 0.5rem 1.5rem;
	}

	.wordcount {
		text-align: right;
		display: inline-block;
		float: right;
	}

	.stats {
		font-size: 1rem;
		display: flex;
		flex-direction: row;
		justify-content: space-around;
		margin: 0;
		padding: 0.75rem 1.5rem 0.75rem 1.5rem;
	}

	.stats > span {
		margin: 0;
	}

	.editable {
		margin: 0.5rem 1.5rem 0.5rem 1.5rem;
		border: none;
		outline: none;
		font-size: 1rem;
		height: 1.3rem;
		overflow: hidden;
		resize: none;
	}

	.threadLabel {
		font-size: 0.75rem;
		color: #fff;
		border-radius: 1rem;
		padding: 0.25rem 0.5rem 0 0.5rem;
	}

	.top {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-start;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}

	.top * {
		margin-bottom: 0.5rem;
		margin-right: 0.5rem;
		padding-bottom: 0.2rem;
	}


</style>
<template>

	<div class="box">
		<span class="top">
			<span class="threadLabel"
				:style="{
					backgroundColor: thread.color
				}" 
			>{{thread.name}}</span>
			<span class="threadLabel"
				:style="{
					backgroundColor: thread.color
				}" 
			>+</span>
		</span>
		<expanding-textarea 
			classes="noteHead"
			maxLength="250" 
			v-bind:input="onHead" 
			v-bind:value="note.head" 
			baseHeight="1.3em"
			placeholder="Title/Summary"
		></expanding-textarea>
		<expanding-textarea
			classes="editable noteBody"
			v-bind:input="onBody" 
			v-bind:value="noteBody" 
			baseHeight="1.3em"
			placeholder="Body"
		></expanding-textarea>
		<span class="stats noteStats">
			<span>{{pageOf}}/{{pages}}</span>
			<span class="wordcount">{{note.wc}} words</span>
		</span>
	</div>

</template>
<script>

	const 
		Vue = require('vue'),
		DateTime = require('./DateTime.vue'),
		ExpandingTextarea = require('./ExpandingTextarea.vue'),
		testWords = /[\w'’]+(?!\w*>)/igm, // capture words and ignore html tags or special chars

		count = function(text) {
			var wc = 0;

			testWords.lastIndex = 0;
			while (testWords.test(text)) wc++;
			return wc;
		};

	module.exports = {
		name: 'note-editor',
		data: function() { return {
			pages: 1,
			pageOf: 1
		}},
		props: ['note', 'menu', 'thread', 'noteBody', 'updateBody'],
		components: {
			DateTime: DateTime,
			ExpandingTextarea: ExpandingTextarea
		},
		methods: {
			countPages: function() {
				this.pages = Math.round(this.note.wc / 275) || 1;
			},
			onHead: function(event) {
				this.note.head = event.target.value;
			},
			onBody: function(event) {
				this.updateBody(event.target.value);
				this.note.wc = count(event.target.value);
				this.countPages();
				this.onScroll();
			},
			onScroll: function(event) {
				
				this.pageCount();
				this.stickyStats();
				
			},
			pageCount: function() {
				var t;
				if (this.body.clientHeight > window.innerHeight) {
					t = Math.abs(this.body.getBoundingClientRect().top);
					t = (t / this.body.clientHeight) * (this.pages + 1);
					this.pageOf = Math.ceil(t);
					if (this.pageOf > this.pages) this.pageOf = this.pages;
				} else this.pageOf = 1;
			},
			stickyStats: function() {
				if (this.$el.clientHeight > (window.innerHeight - this.toolbar.clientHeight)) {
					this.stats.style.bottom = "0";
					this.stats.style.position = "sticky";
				} else {
					this.stats.style.bottom = "auto";
					this.stats.style.position = "inherit";
				}
			}
		},
		mounted: function() {

			// get reference to toolbar so we can measure it
			this.toolbar = document.getElementById('toolbar');

			this.threads = this.$el.children[0];
			this.head = this.$el.children[1];
			this.body = this.$el.children[2];
			this.stats = this.$el.children[3];

			this.countPages();
			this.onScroll();

			window.addEventListener('scroll', this.onScroll);
			window.addEventListener('resize', this.onResize);

			this.menu([
				{ 
					name: 'undo',
					icon: './dist/img/undo.svg',
					click: function(event){
						document.execCommand('undo');
						//console.log('You clicked: ' + event.currentTarget.name);
					}
				},
				{ 
					name: 'redo',
					icon: './dist/img/redo.svg',
					click: function(event){
						document.execCommand('redo');
						//console.log('You clicked: ' + event.currentTarget.name);
					}
				}

			]);
		},
		destroyed: function() {
			window.removeEventListener('scroll', this.onScroll);
			window.removeEventListener('resize', this.onResize);
		}
	}

</script>