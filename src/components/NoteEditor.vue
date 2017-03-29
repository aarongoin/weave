<style scoped>

	div {
		margin-top: 1rem;
	}

	div > input {
		outline: none;
		border: none;
		font-size: 1.5em;
		margin: 0 1rem 1rem 1rem;
		max-width: 48rem;
		color: #222;
	}

	div > span {
		text-align: right;
		width: 100%;
		max-width: 49rem;
		display: inline-block;
		padding-right: 1rem;
		padding-top: 0.5rem;
		font-size: 1rem;
		color: #666;
	}

	.editable {
		max-width: 48rem;
	}

	.editable p {
		margin: 0.5rem 0 0.5rem 0;
	}

</style>
<template>

	<div class="box">
		<input type="text" name="title" inputmode="latin-prose" size="50" placeholder="Title or something here..." v-on:focus="unfocusBody"/>
		<text-editor v-bind:input="onInput" v-bind:content="note.body" v-on:focus="focusBody"></text-editor>
		<span>Words: {{wc}}</span>
	</div>

</template>
<script>

	const 
		TextEditor = require('./TextEditor.vue');
		testWords = /[\s>("“;.][\w'’]+(?!\w*>)/igm; // capture words and ignore html tags or special chars

	module.exports = {
		name: 'note-editor',
		components: {
			TextEditor: TextEditor
		},
		data: function() { return {
			body: undefined,
			focus: 'editor',
			wc: 0
		}},
		props: ['note', 'canStyle'],
		methods: {
			onInput: function(text) {
				var wc = 0;

				testWords.lastIndex = 0;
				while (testWords.test(text)) wc++;
				this.wc = wc;
			}
		},
		mount: function() {
			// update word count to reflect note.body
			this.onInput(this.note.body);
			var i = this.$children.length;
			while (i--) {
				if (this.$children[i].name === 'text-editor') {
					this.body = this.$children[i];
					break;
				}
			}
		},
		methods: {
			focusBody: function() { this.canStyle(true); },
			unfocusBody: function() { this.canStyle(false); },
			onStyle: function(style) { this.body[style](); }
		}
	}

</script>