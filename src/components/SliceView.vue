<style scoped>

	.crossThread {
		z-index: -11;
		width: 2px;
		position: absolute;
		margin-left: 6.95rem;
		background-color: rgba(255, 255, 255, 0.1);
	}

	.slice {
		display: block;
		width: 14rem;
	}

	.sliceHeader {
		z-index: 10;
		height: 1.5rem;
		position: absolute;
		top: 3rem;
		color: #fff;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 14rem;
		font-size: 0.9rem;
	}

	.space {
		height: 14rem;
		max-height: 14rem;
		display: flex;
		justify-content: center;
		align-items: flex-end;
	}

	button {
		font-size: 0.9rem;
		color: #fff;
		border: none;
		outline: none;
		cursor: pointer;
		width: 1.3rem;
		height: 1.2rem;
		background-color: rgba(0,0,0,0);
		text-align: center;
		margin: 0 1rem 0.4rem 1rem;
		border-radius: 1rem;
	}
	button:hover {
		background-color: rgba(255,255,255,0.2);
	}

	.noNote {
		height: 100%;
		width: 100%;
	}

</style>
<script>

	const
		NoteView = require('./NoteView.vue');

	module.exports = {
		name: 'slice-view',
		components: {
			NoteView: NoteView
		},
		props: ['id', 'slice', 'threads', 'createNote', 'editFunc', 'scrollY'],
		methods: {
			newNote: function(event) {
				this.createNote(this.id, Number(event.target.dataset.thread));
			}
		},
		render: function(EL) {
			var children = [],
				temp,
				i = -1,
				j = 0;

			children.push(EL('div', {
				attrs: {
					class: 'sliceHeader',
					style: 'top:' + this.scrollY
				}
			}, this.slice.datetime));

			children.push(EL('div', {
				attrs: {
					class: 'crossThread',
					style: 'height:' + ((this.threads.length + 1)*14) + 'rem'
				}
			}, '&nbsp;'));

			while (++i < this.threads.length) {
				if (j < this.slice.notes.length && this.slice.notes[j].thread === i) {
					temp = EL('note-view', {
						props: {
							note: this.slice.notes[j++],
							thread: this.threads[i],
							editFunc: this.editFunc
						}
					});

				} else {
					temp = EL('button', {
						attrs: {
							'data-thread': i
						},
						on: {
							click: this.newNote
						},
						props: {
							note: this.slice.notes[j],
							thread: this.threads[i],
							editFunc: this.editFunc
						}
					}, '+');
				}
				children.push(EL('div', { attrs: { class: 'space' }, }, [temp]));	
			}

			return EL('div', { attrs: { class: 'slice' }, }, children);
		}
	}

</script>