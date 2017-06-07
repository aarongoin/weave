module.exports = {
// SLICE ACTIONS
	NEW_SLICE: function(action, store) {
		store.scenes = Object.assign([], store.scenes);
		store.scenes.splice(action.atIndex, 0, {
			datetime: '',
			notes: store.locations.map(()=>null)
		});
		return store;
	},
	DELETE_SLICE: function(action, store) {
		store.scenes = Object.assign([], store.scenes);
		action.slice = store.scenes.splice(action.atIndex, 1);
		return store;
	},
	MODIFY_SLICE_DATE: function(action, store) {
		store.scenes = Object.assign([], store.scenes);
		store.scenes[action.atIndex].datetime = action.newDate;
		return store;
	},

// NOTE ACTIONS
	NEW_NOTE: function(action, store) {
		store.scenes = Object.assign([], store.scenes);
		store.scenes[action.sliceIndex].notes.splice(action.noteIndex, 1, {
			thread: 0,
			head: '',
			body: '',
			wc: 0
		});
		return store;
	},
	DELETE_NOTE: function(action, store) {
		store.scenes = Object.assign([], store.scenes);
		store.scenes[action.sliceIndex].notes[action.noteIndex] = null;
		return store;
	},
	MODIFY_NOTE_HEAD: function(action, store) {
		store.scenes = Object.assign([], store.scenes);
		store.scenes[action.sliceIndex].notes[action.noteIndex].head = action.newHead;
		return store;
	},
	MODIFY_NOTE_BODY: function(action, store) {
		store.scenes = Object.assign([], store.scenes);
		var note = store.scenes[action.sliceIndex].notes[action.noteIndex];
		note.body = action.newBody;
		note.wc = action.wc;
		return store;
	},
	MODIFY_NOTE_THREAD: function(action, store) {
		var note;
		store.slices = Object.assign([], store.slices);
		note = store.scenes[action.sliceIndex].notes[action.noteIndex];
		if (++note.thread === store.threads.length) note.thread = 0;
		return store;
	},

// LOCATION ACTIONS
	NEW_LOCATION: function(action, store) {
		var i = store.scenes.length;
		store.locations = Object.assign([], store.locations);
		store.scenes = Object.assign([], store.scenes);
		store.locations.push('');
		while (i--) store.scenes[i].notes.push(null);
		return store;
	},
	DELETE_LOCATION: function(action, store) {
		var i = store.scenes.length;
		store.locations = Object.assign([], store.locations);
		store.scenes = Object.assign([], store.scenes);
		action.location = store.locations.splice(action.atIndex, 1);
		while (i--) store.scenes[i].notes.splice(action.atIndex, 1);
		return store;
	},
	MOVE_LOCATION: function(action, store) {
		var i = store.scenes.length, notes;
		store.locations = Object.assign([], store.locations);
		store.scenes = Object.assign([], store.scenes);
		store.locations.splice(action.toIndex, 0, store.locations.splice(action.fromIndex, 1));
		while (i--) {
			notes = store.scenes[i].notes
			notes.splice(action.toIndex, 0, notes.splice(action.fromIndex, 1));
		}
		return store;
	},
	MODIFY_LOCATION_NAME: function(action, store) {
		store.locations = Object.assign([], store.locations);
		store.locations[action.atIndex] = action.newName;
		return store;
	},

// THREAD ACTIONS
	NEW_THREAD: function(action, store) {
		store.threads = Object.assign([], store.threads);
		store.threads.push({
			color: action.color,
			name: action.name
		});
		return store;
	},
	DELETE_THREAD: function(action, store) {
		store.threads = Object.assign([], store.threads);
		store.splice(action.atIndex, 1);
		return store;
	},
	MODIFY_THREAD_NAME: function(action, store) {
		store.threads = Object.assign([], store.threads);
		store.threads[action.atIndex].name = action.newName;
		return store;
	}
};