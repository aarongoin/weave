<style>

	.editable {
		outline: none;
	}

</style>
<template>

	<div class="editable" contenteditable="true" v-on:input="onInput">
		<p v-html="content"></p>
	</div>

</template>
<script>

/*
	Supported Tags:

	<br>		: line break
	<p></p> 	: paragraph
	<b></b> 	: bold
	<i></i> 	: italic
	<s></s> 	: strikethrough
	<u></u> 	: underline
	<sup></sup> : superscript
	<sub></sub> : subscript
*/

	const 
		attr = /(<!?\w+)[^>]*/igm,
		media = /<(picture|noscript|script|audio|area|canvas|video|img|head|map|embed|object|style)[\s\S]*<\/\1>/igm,
		em = /(<|\/)em/gi,
		strong = /(<|\/)(?:strong|h\d)/gi,
		paragraph = /(<|\/)(?:address|article|aside|blockquote|dt|dd|div|fieldset|figcaption|footer|header|hgroup|li|main|nav|ol|ul|output|pre|section|table|tfoot)/gi,
		illegal = /(?:(?:<|<\/)!?(?!br|p>|b>|i>|s>|u>|sup>|sub>)\w*\/?>\s*)+/ig;
		

	module.exports = {
		name: 'text-editor',
		props: [
			'input',
			'content'
		],
		methods: {
			onPaste: function(e) {
				var html = e.clipboardData.getData('text/html');
				if (!html) e.clipboardData.getData('text')

				html = new String(html);

				e.stopPropagation();
		    	e.preventDefault();

		    	// replace line feeds with spaces
		    	html = html.replace(/$\s+/igm, ' ');
				// remove media and script elements along with children
				html = html.replace(media, '');
				// strip out all attributes && doctypes
				html = html.replace(attr, '$1');
				// convert em tags to i
				html = html.replace(em, '$1i');
				// convert strong and h* tags to b
				html = html.replace(strong, '$1b');
				// convert paragraph
				html = html.replace(paragraph, '$1p');
				// strip all unsupported tags and replace with space
				html = html.replace(illegal, ' ');

				// TODO: handle IE (which supposedly doesn't support insertHTML)
				document.execCommand('insertHTML', false, html.trim());
				this.$el.focus();
			},
			onInput: function(event) {
				this.input(event.target.innerHTML);
			},
			// Handlers for external style buttons
			onBold: function() {
				this.$el.focus();
				document.execCommand('bold', false);
				this.$el.focus();
			},
			onItalic: function() {
				this.$el.focus();
				document.execCommand('italic', false);
				this.$el.focus();
			},
			onStrikeThrough: function() {
				this.$el.focus();
				document.execCommand('strikeThrough', false);
				this.$el.focus();
			},
			onUnderline: function() {
				this.$el.focus();
				document.execCommand('underline', false);
				this.$el.focus();
			},
			onSuperscript: function() {
				this.$el.focus();
				document.execCommand('superscript', false);
				this.$el.focus();
			},
			onSubscript: function() {
				this.$el.focus();
				document.execCommand('subscript', false);
				this.$el.focus();
			}
		},
		mounted: function() {
			this.$el.addEventListener('paste', this.onPaste);
		}
	}

</script>