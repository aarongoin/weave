module.exports = {
// SLICE ACTIONS
	NEW_SLICE: function(action, store) {
		store.slices = Object.assign([], store.slices);
		store.headers = Object.assign([], store.headers);
		store.slices.splice(action.atIndex, 0, {
			datetime: '',
			scenes: store.threads.map(()=>null)
		});
		store.headers.splice(action.atIndex, 0, '');
		return store;
	},
	DELETE_SLICE: function(action, store) {
		store.slices = Object.assign([], store.slices);
		store.headers = Object.assign([], store.headers);
		action.slice = store.slices.splice(action.atIndex, 1);
		action.header = store.headers.splice(action.atIndex, 1);
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
		store.slices[action.sliceIndex].scenes.splice(action.sceneIndex, 1, {
			thread: 0,
			head: '',
			body: '',
			wc: 0
		});
		return store;
	},
	DELETE_NOTE: function(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.sliceIndex].scenes[action.sceneIndex] = null;
		return store;
	},
	MODIFY_NOTE_HEAD: function(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.sliceIndex].scenes[action.sceneIndex].head = action.newHead;
		return store;
	},
	MODIFY_NOTE_BODY: function(action, store) {
		store.slices = Object.assign([], store.slices);
		var scene = store.slices[action.sliceIndex].scenes[action.sceneIndex];
		scene.body = action.newBody;
		scene.wc = action.wc;
		return store;
	},
	MODIFY_NOTE_LOCATION: function(action, store) {
		var scene;
		store.slices = Object.assign([], store.slices);
		scene = store.slices[action.sliceIndex].scenes[action.sceneIndex];
		scene.location = action.newLocation;
		return store;
	},
	MOVE_NOTE: function(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.to.sliceIndex].scenes[action.to.sceneIndex] = store.slices[action.from.sliceIndex].scenes[action.from.sceneIndex];
		store.slices[action.from.sliceIndex].scenes[action.from.sceneIndex] = null;
		return store;
	},

// THREAD ACTIONS
	NEW_THREAD: function(action, store) {
		var i = store.slices.length;
		store.threads = Object.assign([], store.threads);
		store.slices = Object.assign([], store.slices);
		store.threads.push({
			color: action.color,
			name: ''
		});
		while (i--) store.slices[i].scenes.push(null);
		return store;
	},
	DELETE_THREAD: function(action, store) {
		var i = store.slices.length;
		store.threads = Object.assign([], store.threads);
		store.slices = Object.assign([], store.slices);
		action.thread = store.threads.splice(action.atIndex, 1);
		while (i--) store.slices[i].scenes.splice(action.atIndex, 1);
		return store;
	},
	MOVE_THREAD: function(action, store) {
		var i = store.slices.length, scenes;
		store.threads = Object.assign([], store.threads);
		store.slices = Object.assign([], store.slices);
		store.threads.splice(action.toIndex, 0, store.threads.splice(action.fromIndex, 1)[0]);
		while (i--) {
			scenes = store.slices[i].scenes;
			scenes.splice(action.toIndex, 0, scenes.splice(action.fromIndex, 1)[0]);
		}
		return store;
	},
	MODIFY_THREAD_NAME: function(action, store) {
		store.threads = Object.assign([], store.threads);
		store.threads[action.atIndex].name = action.newName;
		return store;
	},
	MODIFY_THREAD_COLOR: function(action, store) {
		store.threads = Object.assign([], store.threads);
		store.threads[action.atIndex].color = action.color;
		return store;
	},

	MODIFY_HEADER: function(action, store) {
		store.headers = Object.assign([], store.headers);
		store.headers[action.atIndex] = action.newValue;
		return store;
	},/*,

// LOCATION ACTIONS
	NEW_LOCATION: function(action, store) {
		store.threads = Object.assign([], store.threads);
		store.threads.push('');
		return store;
	},
	DELETE_LOCATION: function(action, store) {
		store.threads = Object.assign([], store.threads);
		store.splice(action.atIndex, 1);
		return store;
	},
	MODIFY_LOCATION: function(action, store) {
		store.threads = Object.assign([], store.threads);
		store.threads[action.atIndex] = action.newName;
		return store;
	}*/
};