const
	History = require('./history.js'),
	LZW = require('./lz-string.js'),
	Source = require('./Sourcery.js');
/*

Past: []
Future: []

userId/projectId/noteId/version
userId/projectId/slices/version
userId/projectId/threadId/version

Data changes:
	add_note -> rem_note
	rem_note -> add_note
	add_slice -> rem_slice
	rem_slice -> add_slice
	add_thread -> rem_thread
	rem_thread -> add_thread
Note changes:
	body
	head
	thread

	move_slice
	move_thread

*/

const actions = {
		createSlice: function(action, undo) {
			if (undo) {

			} else {
				state.slices.splice(action.atIndex, 0, action.diff || {
					datetime: '',
					notes: []
				});
			}
		},
		removeSlice: function(action) {
			return state.slices.splice(action.atIndex, 1);
		},
		createNote: function(action) {
			var notes = state.slices[sliceId].notes,
				i = notes.length - 1,
				note = {
					id: action.withId,
					thread: action.threadId,
					head: '',
					body: '',
					wc: 0
				};

			// insert new note in by thread in ascending order
			if (threadId > notes[i++].thread) notes.push(note);
			else while (i--) if (threadId < notes[i].thread) {
				notes.splice(i, 0, note);
				break;
			}

		},
		removeNote: function(action) {
			var notes = state.slices[sliceId].notes,
				i = notes.length;

			while (i--) if (action.threadId === notes[i].thread) return notes.splice(i, 1);
		}
	};

module.exports = {
	do: function(action) {
		doo[action.type](action);
		pastActions.push(action);
	},
	undo: function() {
		var a;
		if (pastActions.length) {
			a = pastActions.pop();
			undo[a.type](a);
			futureActions.push(a);
		}
	},
	redo: function() {
		var a;
		if (futureActions.length) {
			a = futureActions.pop();
			doo[action.type](action);
			pastActions.push(action);
		}
	}
};
	

module.exports = {

	createNote: function(slice, thread) {
		var note = {};
		note.id = (new Date()).toJSON(); // looks something like: 2017-10-26T07:46:36.611Z
		note.revision = 0;
		note.head = '';
		note.wc = 0;
		note.thread = thread;
		note.compressed = false;

		return init;
	},

	// lazy decompression of notes
	userWillRead: function(note) {
		if (note.compressed) {
			note.body = LZW.decompressFromUTF16(note.body);
			note.compressed = false;
		}
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

	checkDateTime: function(datetime, thread) {
		var i = this.notes.length;

		while (i--) {
			// check for if notes conflict
			if (datetime < this.notes[i].datetime) break;
			else if ((datetime === this.notes[i].datetime) && (thread === this.notes[i].thread)) return false;
	
		}
		return true;
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

	saveLocal: function() {

		// recompress note bodies
		var n, i = notes.length;
		while (i--) {
			n = notes[i];
			if (!n.compressed) {
				n.body = LZW.compressToUTF16(n.body);
				n.compressed = true;
			}
		}

		// save notes and threads
		localStorage.setItem('notes', JSON.stringify(notes));
		localStorage.setItem('threads', JSON.stringify(threads));
	}
}