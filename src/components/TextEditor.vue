<template>
	<div class="editable" contenteditable="true" v-html="content"></div>
</template>

<script>
var attr = /(<!?\w+)[^>]*/igm,
	media = /<(picture|noscript|script|audio|area|canvas|video|img|head|map|embed|object|style)[\s\S]*<\/\1>/igm,
	em = /(<|\/)em/gi,
	strong = /(<|\/)(?:strong|h\d)/gi,
	paragraph = /(<|\/)(?:address|article|aside|blockquote|dt|dd|div|fieldset|figcaption|footer|header|hgroup|li|main|nav|ol|ul|output|pre|section|table|tfoot)/gi,
	illegal = /(?:(?:<|<\/)!?(?!br|p>|i>|b>)\w*\/?>\s*)+/ig;

module.exports = {
	name: 'text-editor',
	data: function() { return {
		content: "<p>text here</p>"
	}},
	methods: {
		onPaste: function(e) {
			var html = new String(e.clipboardData.getData('text/html'));

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
		}
	},
	mounted: function() {
		this.$el.addEventListener('paste', this.onPaste);
	}
}
</script>

<style>
	.editable {
		outline: none;
		padding: 1rem;
	}
</style>