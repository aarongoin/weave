(function(){
	var store = {
		notes: localStorage.getItem('notes') ? JSON.parse(localStorage.getItem('notes')) : [],
		threads: localStorage.getItem('threads') ? JSON.parse(localStorage.getItem('threads')) : [],

		view: 'weave',

		historyLength: sessionStorage.getItem('historyLength') || 0,
		historyIndex: sessionStorage.getItem('historyIndex') || 0,
		canRedo: false,
		canUndo: false,

		createNote: function(init) {
			init = init || {};
			init.title = init.title || '';
			init.datetime = init.datetime || new Date();
			init.wc = init.wc || 0;
			init.body = init.body || '';
			init.thread = init.thread || 0;

			return init;
		},
		getNotesForThread: function(thread) {
			var l = this.notes.length,
				i = -1,
				n = [];

			while (++i < l) if (this.notes[i].thread === thread) n.pop(this.notes[i]);

			return n;
		},
		getNotesForDate: function(date) {
			// TODO - find and return list of notes for date
		},
		getNotesForKeywords: function(keywords) {
			// TODO - find and return list of notes based on keyword search
		},
		addNote: function(note) {
			// sort note into list
			var i = this.notes.length,
				n;

			while (i--) {
				n = this.notes[i];
				// check for if notes conflict
				if (note.datetime <= n.datetime) {
					if (note.thread === n.thread) return false;
					else if (note.thread < n.thread) {
						this.notes.splice(i, 0, note);
						break;
					}
				}
			}
			// add to history
		},
		removeNote: function(note) {
			var i = this.notes.indexOf(note);
			if (i !== -1) this.notes.splice(i, 1);

			// add to history
		},
		addThread: function(thread) {
			var i = this.threads.length;
			while (i--) if (this.threads[i].name === thread.name) return false;
			
			this.threads.push(thread);

			// add to history
		},
		removeThread: function(thread) {
			var i = this.threads.indexOf(thread);
			if (i !== -1) this.threads.splice(i, 1);

			// TODO - remove corresponding notes too?

			// add to history
		},

		addToHistory: function(change) {
			// check for new branch in history
			// (ie. old chnages that have been undone, and are now being invalidated by a new change)
			if (this.historyIndex === this.historyLength) {
				sessionStorage.setItem(String(this.historyLength), change);
				sessionStorage.setItem('historyLength', String(++this.historyLength));
			} else while (this.historyLength-- > this.historyIndex) {
				// clear out irrelevant history branch
				sessionStorage.removeItem(String(this.historyLength));
			}
			sessionStorage.setItem('historyIndex', String(++this.historyIndex));

			this.canRedo = false;
			this.canUndo = true;
		},

		undoHistory: function() {
			// TODO - actually rewind change
			sessionStorage.setItem('historyIndex', String(--this.historyIndex));
			this.canRedo = true;
			this.canUndo = (this.historyIndex > 0);

		},
		redoHistory: function() {
			// TODO - actually redo change
			sessionStorage.setItem('historyIndex', String(++this.historyIndex));
			this.canUndo = true;
			this.canRedo = (this.historyIndex < this.historyLength);
		}

	},
	keyHandler = function(event) {
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
			default:
				break;
		}
	};

	store.canUndo = (store.historyIndex > 0);
	store.canRedo = (store.historyIndex < store.historyLength);

	window.addEventListener('keyup', keyHandler);

	window.onbeforeunload = function() {
		// save notes and threads
		localStorage.setItem('notes', store.notes);
		localStorage.setItem('threads', store.threads);

		window.removeEventListener('keyup', keyHandler);
	}

	var noteView = Vue.component('note-view', {
		props: ['note']
		// TODO:
		// - 2-way data bind to element current size
	});

	var weaveView = Vue.component('weave-view', {
			// all notes in all threads
		}),
		threadView = Vue.component('thread-view', {
			// all notes on a single thread (left/right moves to different thread)
		}),
		sliceView = Vue.component('slice-view', {
			// all threads in a single slice of time (left/right moves backwards/forwards in time)
		}),
		knotView = Vue.component('knot-view', {
			// edit single note
		});

	Vue.component('app-menu', {
		props: ['title'],
		template: '<header><h1>{{title}}</h1></header>'

	});

	Vue.component('app-content', {
		render: function(create) {
			switch (store.view) {
				case 'weave':
					return create(weaveView, {props: {data: store.data}});
				case 'thread':
					return create(threadView, {props: {data: store.data}});
				case 'slice':
					return create(sliceView, {props: {data: store.data}});
				case 'knot':
					return create(knotView, {props: {data: store.data}});
			}
		}
	});

	new Vue({ el: '#body' });
})();