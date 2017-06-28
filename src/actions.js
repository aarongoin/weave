module.exports = {
	NewProject(action, store) {
		return {
			p: '', // title
			a: '', // author
			w: 0, // word count
			c: 0, // scene count
			s: [], // slices
			t: [] // threads
		};
	},
	ImportProject({project}, store) {
		return project;
	},
	ModifyProjectTitle({title}, store) {
		store.p = title;

		return store;
	},
	ModifyProjectAuthor({author}, store) {
		store.a = author;

		return store;
	},
// SLICE ACTIONS
	NewSlice({atIndex}, store) {
		store.s = Object.assign([], store.s);
		store.s.splice(atIndex, 0, {
			h: '', // header
			s: store.t.map(()=>null) // scenes
		});
		
		return store;
	},
	MoveSliceHeader({from, to}, store) {
		store.s[to].h = store.s[from].h;
		store.s[from].h = '';

		return store;
	},
	DeleteSlice({atIndex}, store) {
		store.s = Object.assign([], store.s);
		store.s.splice(atIndex, 1);

		return store;
	},
	ModifySliceHeader({atIndex, header}, store) {
		store.s[atIndex].h = header;
		return store;
	},

// SCENE ACTIONS
	NewScene(action, store) {
		store.s = Object.assign([], store.s);
		store.s[action.sliceIndex].s.splice(action.sceneIndex, 1, {
			h: '',
			b: '',
			w: 0,
			l: ''
		});
		return store;
	},
	DeleteScene(action, store) {
		store.s = Object.assign([], store.s);
		store.s[action.sliceIndex].s[action.sceneIndex] = null;
		return store;
	},
	ModifySceneHead(action, store) {
		store.s = Object.assign([], store.s);
		store.s[action.sliceIndex].s[action.sceneIndex].h = action.newHead;
		return store;
	},
	ModifySceneBody(action, store) {
		store.s = Object.assign([], store.s);
		var scene = store.s[action.sliceIndex].s[action.sceneIndex];
		scene.b = action.newBody;
		scene.w = action.wc;
		return store;
	},
	ModifySceneLocation(action, store) {
		store.s = Object.assign([], store.s);
		scene = store.s[action.sliceIndex].s[action.sceneIndex].l = action.newLocation;
		return store;
	},
	MoveScene(action, store) {
		store.s = Object.assign([], store.s);
		store.s[action.to.sliceIndex].s[action.to.sceneIndex] = store.s[action.from.sliceIndex].s[action.from.sceneIndex];
		store.s[action.from.sliceIndex].s[action.from.sceneIndex] = null;
		return store;
	},

// THREAD ACTIONS
	NewThread(action, store) {
		var i = store.s.length;
		store.t = Object.assign([], store.t);
		store.s = Object.assign([], store.s);
		store.t.push({
			c: action.color,
			n: ''
		});
		while (i--) store.s[i].s.push(null);
		return store;
	},
	DeleteThread(action, store) {
		var i = store.s.length;
		store.t = Object.assign([], store.t);
		store.s = Object.assign([], store.s);
		store.t.splice(action.atIndex, 1);
		while (i--) store.s[i].s.splice(action.atIndex, 1);
		return store;
	},
	MoveThread(action, store) {
		var i = store.s.length, scenes;
		store.t = Object.assign([], store.t);
		store.s = Object.assign([], store.s);
		store.t.splice(action.toIndex, 0, store.t.splice(action.fromIndex, 1)[0]);
		while (i--) {
			scenes = store.s[i].s;
			scenes.splice(action.toIndex, 0, scenes.splice(action.fromIndex, 1)[0]);
		}
		return store;
	},
	ModifyThreadName(action, store) {
		store.t = Object.assign([], store.t);
		store.t[action.atIndex].n = action.newName;
		return store;
	},
	ModifyThreadColor(action, store) {
		store.t = Object.assign([], store.t);
		store.t[action.atIndex].c = action.color;
		return store;
	}
};