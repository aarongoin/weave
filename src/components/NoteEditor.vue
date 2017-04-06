<style scoped>

	div {
		margin-top: 1rem;
	}

	div > input {
		outline: none;
		border: none;
		font-size: 1.7rem;
		margin-right:1rem;
		margin-bottom: 0.5rem;
		max-width: 32rem;
		color: #222;
		display: inline-block;
	}

	.wordcount {
		text-align: right;
		display: inline-block;
		float: right;
	}

	.stats {
		width: 100%;
		max-width: 49rem;
		font-size: 1rem;
		color: #666;
		display: inline-block;
	}

	.editable {
		margin: 0.5rem 0 0.5rem 0;

		border: none;
		outline: none;
		font-size: 1em;
		height:100%;
		width: 100%;
		overflow: hidden;
		resize: none;
	}


</style>
<template>

	<div class="box">
		<input type="text" name="title" inputmode="latin-prose" size="50" placeholder="Title or something here..."/>
		<date-time initial="1999----" thread="0"></date-time>
		<textarea
			class="editable"
			v-on:mousedown="check = true"
			v-on:mouseup="check = false"
			v-on:input="onInput"
			v-bind:style="height"
		></textarea>
		<!--<text-editor v-bind:input="onInput" v-bind:initial="(note) ? note.body : [{index: 0, end: 32, text: 'Heya.\r\nPut some text here, okay!', style=0}]" v-on:focus="focusBody"></text-editor>-->
		<span class="stats">
			&nbsp; <!-- this space prevents jank when we hide/show selection count  since wordcount-->
			<span v-if="(showSelection&&(selectedCount > 0))">Selected: {{selectedCount}} words</span>
			<span class="wordcount">Words: {{wc}} Pages: {{pages}}</span></span>
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
			text: "",
			selection: "",
			showSelection: false,
			check: false,
			height: '1em'
		}},
		props: ['note'],
		components: {
			DateTime: DateTime
		},
		methods: {
			checkSelection: function(event) {
				if (this.check) {
					this.showSelection = true;
					event = this.$el.children[2];
					if (event.selectionStart !== event.selectionEnd) {
						this.selection = this.text.slice(event.selectionStart, event.selectionEnd);
					}
				}
			},
			resetCount: function() {
				this.selection = this.text;
				this.showSelection = false;
			},
			onInput: function(event) {
				this.text = event.target.value
				this.showSelection = false;
				this.height = 'height: auto';
				Vue.nextTick(this.resize);
			},
			resize: function() {
				this.height = 'height:' + event.target.scrollHeight + 'px';
			},
		},
		computed: {
			wc: function() {
				return count(this.text);
			},
			selectedCount: function() {
				return count(this.selection);
			},
			pages: function() {
				return Math.ceil(this.wc / 300);
			}
		},
		mounted: function() {
			this.$el.children[1].value = (this.note && this.note.body) ? this.note.body : "This could be your great adventure.";
			window.addEventListener('mousemove', this.checkSelection);
			window.addEventListener('mousedown', this.resetCount);
		},
		destroyed: function() {
			window.removeEventListener('mousemove', this.checkSelection);
		}
	}

</script>