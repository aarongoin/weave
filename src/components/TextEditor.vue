<style scoped>

	@keyframes blinker {  
		0% { opacity: 1.0; }
		50% { opacity: 0.0; }
		100% { opacity: 1.0; }
	}

	@-webkit-keyframes blinker {  
		0% { opacity: 1.0; }
		50% { opacity: 0.0; }
		100% { opacity: 1.0; }
	}

	div {
		position: relative;
	}

	.editable {
		border: none;
		outline: none;
		width:100%;
		font-size: 1em;
		height:100%;
		overflow: hidden;
		resize: none;
	}

	.over {
		pointer-events: none;
		position: relative;
		background-color: white;
	}

	.under {
		position: absolute;
		left: 0;
		top: 0;
		pointer-events: auto;
	}

	.cursor {
		width: 0.1em;
		height: 1.5em;
		background-color: blue;
		pointer-events: auto;
		margin: 0 0 0 0;
		animation: blinker steps(1) 1000ms infinite;
	}

</style>
<template>
	<div>
		<textarea class="editable under" v-on:input="onInput" v-on:mousedown="onMouseDown" v-on:mouseup="onMouseUp" v-bind:style="height"></textarea>
		<section class="editable over" v-html="styled"></section>
		<div class="cursor"></div>
	</div>

</template>
<script>

/*
	Supported Tags:

	<br>		: line break
	<i></i> 	: italic
*/

	const 
		Vue = require('vue'),
		attr = /(<!?\w+)[^>]*/igm,
		media = /<(picture|noscript|script|audio|area|canvas|video|img|head|map|embed|object|style)[\s\S]*<\/\1>/igm,
		em = /(<|\/)em/gi,
		strong = /(<|\/)(?:strong|h\d)/gi,
		paragraph = /(<|\/)(?:address|article|aside|blockquote|dt|dd|div|fieldset|figcaption|footer|header|hgroup|li|main|nav|ol|ul|output|pre|section|table|tfoot)/gi,
		illegal = /(?:(?:<|<\/)!?(?!br|p>|b>|i>|s>|u>|sup>|sub>)\w*\/?>\s*)+/ig,
		pOpenText = /(<p[^>]*>(?:\s?[^<\s]+\s?)*)<p[^>]*>/igm,
		pCloseText = /<\/\s*p>((?:\s*[^<\s]\s*)+<\/\s*p>)/igm
		pWhitespace = /(<\/?p[^>]*>)\s*\1/igm,
		newline = /(\r?\n)/igm,
		cursorCounter = /(<i>)|(</i>|<br>)/igm,

		renderNode = function(node, a, b) {
			switch(node.style) {
				case 0: // plain text
					if (b) return node.text.slice(a - node.index, b);
					else return node.text.slice(a - node.index);
				case 1: // italics
					if (b) return '<i>' + node.text.slice(a - node.index, b) + '</i>';
					else return '<i>' + node.text.slice(a - node.index) + '</i>';
			}
		},
		renderCursor = function(state, index, text) {
			return text.slice(0, index) + (state === 0) ? '<span id="selection"></span>' : (state == 1) ? '<span id="selection">' : '</span>' + text.slice(index);
		},

		standardizeContent = function(content) {

			// replace line feeds with spaces
	    	content = content.replace(/$\s+/igm, ' ');
			// remove media and script elements along with children
			content = content.replace(media, '');
			// strip out all attributes && doctypes
			content = content.replace(attr, '$1');
			// convert em tags to i
			content = content.replace(em, '$1i');
			// convert strong and h* tags to b
			content = content.replace(strong, '$1b');
			// convert paragraph
			content = content.replace(paragraph, '$1p');
			// strip all unsupported tags and replace with space
			content = content.replace(illegal, ' ');

			//content = content.replace(pWhitespace, '$1');
			//content = content.replace(pOpenText, '$1</p>$2');
			//content = content.replace(pCloseText, '$1<p>$2');	


			return content;
		},
		cursor = { focusStart: true, _start: 0, _end: 0, __start: 0, __end: 0 };

	Object.defineProperty(cursor, 'start', {
		get: function() { return cursor._start; }
		set: function(v) {
			cursor.__start = cursor._start;
			cursor._start = v;
			if (v !== cursor.__start) cursor.focusStart = true;
		}
	});

	Object.defineProperty(cursor, 'end', {
		get: function() { return cursor._end; }
		set: function(v) {
			cursor.__end = cursor._end;
			cursor._end = v;
			if (v !== cursor.__end) cursor.focusStart = false;
		}
	});
		

	module.exports = {
		name: 'text-editor',
		props: [
			'input',
			'initial'
		],
		computed: {
			// convert textarea plain text to rendered html with italics
			styled: function() {
				var //focus = this.$el.firstChild.selectionEnd,
					//anchor = this.$el.firstChild.selectionStart,
					c = 0,
					n,
					i = -1,
					out = "";

				while (++i < this.italics.length) {
					n = this.italics[i];
					if (n[0] > c) {
						out += this.text.slice(c, n[0]);
					}
					out += '<i>' + this.text.slice(n[0], n[1]) + '</i>';
					c = n[1];
				}
				if (c < this.text.length) out += this.text.slice(c);

				out = out.replace(newline, '<br>');

				if (out.length === 0 || out.slice(out.length-4) === "<br>") out += '&nbsp;';

				return out;
			}
		},
		data: function() {
			return {
				height: '1em',
				content: this.initial
			};
		},
		methods: {
			renderText: function(a, b) {
				var temp = "",
					out = "",
					i = -1,
					c;

				while (++i < this.content.length && a < b) {
					c = this.content[i];
					if (a >= c.index && a < c.end) { // render to b or c.end
						if (b < c.end) {
							temp = c.text.slice(a-c.index, b-c.index);
							a = b;
						} else {
							temp = c.text.slice(a-c.index);
							a = c.end;
						}
						if (cursor.start > c.index && cursor.end < c.end) {
							if (cursor.start === cursor.end) {
								temp = renderCursor(0, (cursor.start - c.index) + ((c.style) ? 3 : 0), temp);
							} else if (cursor.end < c.end) {
								temp = renderCursor(1, cursor.start - c.index) + ((c.style) ? 3 : 0), temp)
							}
						}
					}
					out += temp;
				}

				out = out.replace(newline, '<br>');

				if (out.slice(out.length-4) === "<br>") out += '&nbsp;';

				return out;
			},
			renderCursor: function(a, b, text) {
				var c = 0
					r;

				if (a > cursor.end || b < cursor.start) return text;
				cursorCounter.lastIndex = a;
				while (cursorCounter.lastIndex < br = cursorCounter.match(text))
			},
			onPaste: function(e) {
				var html = e.clipboardData.getData('text/html');
				if (html === "") e.clipboardData.getData('text')

				e.stopPropagation();
		    	e.preventDefault();

				html = standardizeContent(String(html));

				//document.execCommand('insertHTML', false, html.trim());
				this.$el.focus();
			},
			onItalic: function() {
				//document.execCommand('italic', false);
			},
			onKeyUp: function(event) {
				// check selection first

				// check for edit/undo
				if (!event.shiftKey && ((event.metaKey && !event.ctrlKey) || event.ctrlKey)) {
					if (event.key === 'z' && store.canUndo) {
						undoHistory();
						event.preventDefault();
					} else if (event.key === 'y' && store.canRedo) {
						redoHistory();
						event.preventDefault();
					}
				} else switch (event.key) {
					case 'ArrowUp':
						// TODO - handle based on app view state
						break;
					case 'ArrowDown':
						// TODO - handle based on app view state
						break;
					case 'ArrowLeft':
						// TODO - handle based on app view state
						break;
					case 'ArrowRight':
						// TODO - handle based on app view state
						break;
					case 'Enter':
						// TODO - handle based on app view state
						break;
					default:
						break;
				}

				//this.input(this.$el.innerHTML);
			},
			onClick: function(event) {
				console.log(event.target);
			},
			onInput: function(event) {
				this.text = event.target.value;
				this.height = 'height:' + event.target.scrollHeight + 'px';
				this.input(this.text);
				Vue.nextTick(this.resize);
			},
			onMouseDown: function(event) {
				// reposition cursor
			},
			onMouseUp:function(event) {

			},
			resize: function() {
				var h = this.$el.lastChild.clientHeight
				this.height = 'height:' + ((h === 0) ? '1em' : h+'px');
			},
			updateCursor: function() {
				cursor.start = this.$el.firstChild.selectionStart;
				cursor.end = this.$el.firstChild.selectionEnd;
			}
		},
		mounted: function() {
			//this.$el.addEventListener('paste', this.onPaste);
			window.addEventListener('keyup', this.onKeyUp);
			//window.addEventListener('click', this.onClick);
			this.$el.firstChild.value = this.text;
			this.input(this.initial);

		},
		destroyed: function() {
			window.removeEventListener('keyup', this.onKeyUp);
		}
	}

</script>