module.exports = {
// SLICE ACTIONS
	NEW_SLICE: function(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices.splice(action.atIndex, 0, {
			datetime: 'Datetime',
			notes: store.locations.map(()=>null)
		});
		return store;
	},
	DELETE_SLICE: function(action, store) {
		store.slices = Object.assign([], store.slices);
		action.slice = store.slices.splice(action.atIndex, 1);
		return store;
	},
	MODIFY_SLICE_DATE: function(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.atIndex].datetime = action.newDate;
		return store;
	},

// NOTE ACTIONS
	NEW_NOTE: function(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.sliceIndex].notes.splice(action.noteIndex, 1, {
			thread: 0,
			head: '',
			body: '',
			wc: 0
		});
		return store;
	},
	DELETE_NOTE: function(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.sliceIndex].notes[action.noteIndex] = null;
		return store;
	},
	MODIFY_NOTE_HEAD: function(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.sliceIndex].notes[action.noteIndex].head = action.newHead;
		return store;
	},
	MODIFY_NOTE_BODY: function(action, store) {
		store.slices = Object.assign([], store.slices);
		var note = store.slices[action.sliceIndex].notes[action.noteIndex];
		note.body = action.newBody;
		note.wc = action.wc;
		return store;
	},

// LOCATION ACTIONS
	NEW_LOCATION: function(action, store) {
		var i = store.slices.length;
		store.locations = Object.assign([], store.locations);
		store.slices = Object.assign([], store.slices);
		store.locations.push('Location');
		while (i--) store.slices[i].notes.push(null);
		return store;
	},
	DELETE_LOCATION: function(action, store) {
		var i = store.slices.length;
		store.locations = Object.assign([], store.locations);
		store.slices = Object.assign([], store.slices);
		action.location = store.locations.splice(action.atIndex, 1);
		while (i--) store.slices[i].notes.splice(action.atIndex, 1);
		return store;
	},
	MOVE_LOCATION: function(action, store) {
		var i = store.slices.length, notes;
		store.locations = Object.assign([], store.locations);
		store.slices = Object.assign([], store.slices);
		store.locations.splice(action.toIndex, 0, store.locations.splice(action.fromIndex, 1));
		while (i--) {
			notes = store.slices[i].notes
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
		store.thread.push({
			color: '#ffffff',
			name: 'Thread'
		});
		return store;
	},
	DELETE_THREAD: function(action, store) {
		store.splice(action.atIndex, 1);
		return store;
	},
	MODIFY_THREAD_COLOR: function(action, store) {
		store.thread[action.atIndex].color = action.newColor;
		return store;
	},
};