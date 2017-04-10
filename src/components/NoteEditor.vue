<style scoped>

	div {
		margin-top: 4rem;
		padding-top: 1.5rem;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		align-items: stretch;
	}

	.noteHead {
		outline: none;
		border: none;
		font-size: 1.7rem;
		color: #222;
		overflow: hidden;
		resize: none;
		height: 2rem;
		margin: 0 1.5rem 0.5rem 1.5rem;
	}

	.wordcount {
		text-align: right;
		display: inline-block;
		float: right;
	}

	.stats {
		font-size: 1rem;
		color: #666;
		display: flex;
		flex-direction: row;
		justify-content: space-around;
		margin: 0;
		background-color: #fff;
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


</style>
<template>

	<div class="box">
		<date-time initial="1999----" thread="0"></date-time>
		<textarea class="noteHead" maxlength="250" v-on:input="onInput"></textarea>
		<textarea class="editable" v-on:input="onInput"></textarea>
		<span class="stats">
			<span>{{pageOf}}/{{pages}}</span>
			<span class="wordcount">{{wc}} words</span>
		</span>
	</div>

</template>
<script>

	const 
		Vue = require('vue'),
		DateTime = require('./DateTime.vue'),
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
			//selection: "",
			//showSelection: false,
			//check: false,
			wc: 0,
			pages: 1,
			pageOf: 1
		}},
		props: ['onSave', 'note'],
		components: {
			DateTime: DateTime
		},
		methods: {
			/*selectAll: function(event) {
				this.selection = this.body.value;
				this.showSelection = true;
			},
			checkSelection: function(event) {
				if (this.check) {
					this.showSelection = true;
					event = this.$el.children[2];
					if (event.selectionStart !== event.selectionEnd) {
						this.selection = this.body.value.slice(event.selectionStart, event.selectionEnd);
						if (this.selection === "") this.showSelection = false;
					} else this.showSelection = false;
				}
			},
			resetCount: function() {
				this.selection = this.body.value;
				this.showSelection = false;
			},*/
			onInput: function(event) {
				if (event.target === this.body) {
					//this.showSelection = false;

					this.wc = count(this.body.value);
					this.pages = Math.round(this.wc / 275) || 1;
					this.onScroll();

					this.body.style.height = '1.3rem';
					Vue.nextTick(this.resizeBody);
				} else {
					this.head.style.height = '2rem';
					Vue.nextTick(this.resizeHead);
				}

				this.stickyStats();
			},
			resizeHead: function() {
				this.head.style.height = this.head.scrollHeight + 'px';
			},
			resizeBody: function() {
				this.body.style.height = this.body.scrollHeight + 'px';
			},
			onResize: function(event) {

				this.body.style.height = '1.3rem';
				this.head.style.height = '2rem';

				Vue.nextTick(this.resizeBody);
				Vue.nextTick(this.resizeHead);
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

			this.datetime = this.$el.children[0];
			this.head = this.$el.children[1];
			this.body = this.$el.children[2];
			this.stats = this.$el.children[3];
			this.toolbar = document.getElementById('toolbar');

			this.head.value = (this.note && this.note.head) ? this.note.head : "Title or Summary here.";
			this.body.value = (this.note && this.note.body) ? this.note.body : "This could be your great adventure.";

			this.onInput({ target:this.body});
			this.onInput({ target:this.head});

			//window.addEventListener('mousemove', this.checkSelection);
			//window.addEventListener('mousedown', this.resetCount);

			window.addEventListener('scroll', this.onScroll);
			window.addEventListener('resize', this.onResize);
		},
		destroyed: function() {
			//window.removeEventListener('mousemove', this.checkSelection);
			//window.removeEventListener('mousedown', this.resetCount);

			window.removeEventListener('scroll', this.onScroll);
			window.removeEventListener('resize', this.onResize);
		}
	}

</script>