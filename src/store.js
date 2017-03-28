const
	History = require('./history.js'),
	notes = localStorage.getItem('notes') ? JSON.parse(localStorage.getItem('notes')) : [],
	threads = localStorage.getItem('threads') ? JSON.parse(localStorage.getItem('threads')) : [];

window.onbeforeunload = function() {
	// save notes and threads
	localStorage.setItem('notes', store.notes);
	localStorage.setItem('threads', store.threads);

	window.removeEventListener('keyup', keyHandler);
};

module.exports = {

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
	}

}