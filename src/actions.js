const
	Colors = require('./colors.js'),
	ParseTime = require('./time.js'),
	LZW = require('lz-string'),
	chars = "abcdefghijklmnopqrstuvwxyz0123456789",
	uuid = function() {
		var i = 15,
			id = "";
		while (i--) id += chars.charAt((Math.random() * 36) >> 0);

		return id;
	};

// function adjustIndex(to, from) { // LEGACY? OR DEAD CODE?
// 	return (to > from) ? to - 1 : to
// }

/*
	deep copy values of all properties of pattern from src to pattern--given a JS Object as a pattern, and a JS Object as a src
*/
function extract(pattern, src) {
	for (var key in pattern) {
		if (typeof pattern[key] === 'object' && typeof src[key] === 'object' && src[key] !== null) {
			if (pattern[key] === null)
				pattern[key] = copy(src[key]);
			else extract(pattern[key], src[key]);
		} else pattern[key] = src[key];
	}
	return pattern;
}

/*
	deep copy values of all properties of src from src to dest--given two JS Objects or Arrays as a dest and src
*/
function merge(dest, src, deleteNull=true) {
	for (var key in src) {
		if (src[key] === null && deleteNull) {
			if (Array.isArray(dest)) dest.splice(key, 1);
			else delete dest[key];
		} else if (typeof src[key] === 'object' && src[key] !== null) {
			if (dest[key] === undefined)
				dest[key] = (Array.isArray(src[key])) ? [] : {};
			merge(dest[key], src[key], deleteNull);
		} else dest[key] = src[key];
	}
	return dest;
}

/*
	convenience function to make a deep copy of an object
*/
const copy = (obj) => Array.isArray(obj) ? merge([], obj, false) : merge({}, obj, false);

const base = {
	scene: () => ({
		id: 's' + Date.now(),
		summary: '',
		body: '',
		wc: 0,
		location: '',
		time: '',
		utctime: (new Date()).toISOString(),
		thread: {}
	}),
	meta: () => ({
		id: uuid(),
		title: '',
		author: '',
		email: '',
		modified: (new Date()).toISOString(),
		wc: 0,
		sc: 0,
		nc: 0
	}),
	location: (color) => ({
		id: 'l' + Date.now(),
		name: '',
		color: color || Colors.locationColor(),
		folder: ''
	}),
	thread: (color) => ({
		id: 't' + Date.now(),
		name: '',
		color: color || Colors.threadColor(),
		folder: '',
		time: {}
	}),
	folder: (type) => ({
		id: 'f' + Date.now(),
		name: '',
		open: true,
		color: Colors[type + 'Color'](),
		items: []
	}),
	note: () => ({
		id: 'n' + Date.now(),
		modified: '',
		tag: {},
		body: ''
	}),
	project: () => ({
		meta: base.meta(),
		scene: {},
		thread: {},
		location: {},
		note: {},
		threadList: [],
		threadFolders: [],
		locationList: [],
		locationFolders: [],
		folder: {},
		printSettings: {
			body: true,
			summary: false,
			date: false,
			threads: false,
			location: false
		},
		chapters: [], // [ ...{ title, scenes: [...sceneID] },]
		past: [],
		future: [],
		visible: {},
		search: ''
	})
};



const
MAX_HISTORY = 40,
Actions = {

	NewThread({index, folder, color}, store, patch={}) {
		var t = base.thread(color),
			l = copy(store.threadList);

		if (folder !== undefined) {
			t.folder = folder;
			patch = Actions.CreateThread(t, store, patch);

			folder = store.threadFolders[folder];
			l = copy(store.folder[folder].items);
			l.splice(index, 0, t.id);
			patch = Actions.ModifyFolder({id: folder, items: l}, store, patch);
		} else {
			patch = Actions.CreateThread(t, store, patch);

			l = copy(store.threadList);
			l.splice(index, 0, t.id);
			patch = Actions.ModifyThreadList(l, store, patch);
		}
		l = {};
		l[t.id] = t.id;
		patch = Actions.ModifyVisible(l, store, patch);

		return patch;
	},
	NewLocation({index, folder, color}, store, patch={}) {
		var t = base.location(color),
			l;

		if (folder !== undefined) {
			t.folder = folder;
			patch = Actions.CreateLocation(t, store, patch);

			folder = store.locationFolders[folder];
			l = copy(store.folder[folder].items);
			l.splice(index, 0, t.id);
			patch = Actions.ModifyFolder({id: folder, items: l}, store, patch);
		} else {
			patch = Actions.CreateLocation(t, store, patch);

			l = copy(store.locationList);
			l.splice(index, 0, t.id);
			patch = Actions.ModifyLocationList(l, store, patch);
		}
		l = {};
		l[t.id] = t.id;
		patch = Actions.ModifyVisible(l, store, patch);

		return patch;
	},
	NewLocationFolder(init, store, patch={}) {
		var f = base.folder('location'),
			l = copy(store.locationFolders),
			v = {};

		patch = Actions.CreateLocationFolder(f, store, patch);

		l.splice(0, 0, f.id);
		patch = Actions.ModifyLocationFolders(l, store, patch);

		v[f.id] = true;
		patch = Actions.ModifyVisible(v, store, patch);

		return patch;
	},
	NewThreadFolder(init, store, patch={}) {
		var f = base.folder('thread'),
			l = copy(store.threadFolders),
			v = {};

		patch = Actions.CreateThreadFolder(f, store, patch);

		l.splice(0, 0, f.id);
		patch = Actions.ModifyThreadFolders(l, store, patch);

		v[f.id] = true;
		patch = Actions.ModifyVisible(v, store, patch);

		return patch;
	},
	RemoveThread({id, folder, index}, store, patch={}) {
		var temp;
		if (folder === undefined) {
			patch.threadList = copy(store.threadList);
			store.threadList.splice(index, 1);
		} else {
			temp = copy(store.folder[folder]);
			temp.items.splice(index, 1);
			temp.items[temp.items.length] = null;
			patch = Actions.ModifyFolder(temp, store, patch);
		}
		patch = Actions.DeleteThread(id, store, patch);

		return patch;
	},
	RemoveLocation({id, folder, index}, store, patch={}) {
		var temp;
		if (folder === undefined) {
			patch.locationList = copy(store.locationList);
			store.locationList.splice(index, 1);
		} else {
			temp = copy(store.folder[folder]);
			temp.items.splice(index, 1);
			temp.items[temp.items.length] = null;
			patch = Actions.ModifyFolder(temp, store, patch);
		}
		patch = Actions.DeleteLocation(id, store, patch);

		return patch;
	},
	RemoveFolder({id, index, type}, store, patch={}) {
		// delete any items contained in folder
		store.folder[id].items.forEach((v) => Actions[type === 'Thread' ? 'DeleteThread' : 'DeleteLocation'](v, store, patch))
		
		// remove folder from folder list
		if (type === 'Thread') {
			patch.threadFolders = copy(store.threadFolders);
			store.threadFolders.splice(index, 1);
		} else {
			patch.locationFolders = copy(store.locationFolders);
			store.locationFolders.splice(index, 1);
		}
		// delete folder itself
		patch.folder = patch.folder || {};
		patch.folder[id] = store.folder[id];
		delete store.folder[id];

		return patch;
	},



	CreateProject(init={}, store) {
		Object.assign(store, merge(base.project(), init));
	},

	CreateNote(init, store, patch={}) {
		init = merge(base.note(), init);
		patch.note = patch.note || {};
		patch.note[init.id] = null;
		patch.meta = patch.meta || {};
		patch.meta.nc = store.meta.nc;

		store.note[init.id] = init;
		store.meta.nc++;
		patch.focus = init.id;
		return patch;
	},
	CreateScene(init, store, patch = {}) {
		init.utctime = ParseTime(init.time).ISOString;
		init = merge(base.scene(), init);
		patch.meta = patch.meta || {};
		patch.meta.sc = store.meta.sc;
		patch.scene = patch.scene || {};
		patch.scene[init.id] = null;
		store.scene[init.id] = init;
		store.meta.sc++;
		patch.focus = init.id;
		return patch;
	},
	CreateThread(init, store, patch={}) {
		init = merge(base.thread(), init);
		patch.thread = patch.thread || {};
		patch.thread[init.id] = null;

		init.name = init.name || "";

		store.thread[init.id] = init;
		patch.focus = init.id;
		return patch;
	},
	CreateLocation(init, store, patch={}) {
		init = merge(base.location(), init);
		patch.location = patch.location || {};
		patch.location[init.id] = null;

		init.name = init.name || "";

		store.location[init.id] = init;
		patch.focus = init.id;
		return patch;
	},
	CreateLocationFolder(init, store, patch={}) {
		init = merge(base.folder('location'), init);
		patch.folder = patch.folder || {};
		patch.folder[init.id] = null;

		store.folder[init.id] = init;
		patch.focus = init.id;
		return patch;
	},
	CreateThreadFolder(init, store, patch={}) {
		init = merge(base.folder('thread'), init);
		patch.folder = patch.folder || {};
		patch.folder[init.id] = null;

		store.folder[init.id] = init;
		patch.focus = init.id;
		return patch;
	},


	ModifyScene(init, store, patch={}) {
		var o,
			scene = store.scene[init.id];
		patch.scene = patch.scene || {};
		patch.scene[init.id] = extract(copy(init), store.scene[init.id]);
		if (init.wc) {
			patch.meta = patch.meta || {};
			patch.meta.wc = store.meta.wc;
			store.meta.wc += init.wc - scene.wc;
		}
		// handle changing scene time
		if (init.time !== undefined) {
			patch.utctime = scene.utctime;
			init.utctime = ParseTime(init.time).ISOString;
			for (var t in scene.thread) {
				o = {id: t, time: copy(store.thread[t].time)};
				o.time[scene.utctime] = null;
				o.time[init.utctime] = true;
				Actions.ModifyThread(o, store, patch);
			}
		}

		merge(scene, init);
		return patch;
	},
	ModifyThread(init, store, patch={}) {
		patch.thread = patch.thread || {};
		patch.thread[init.id] = extract(copy(init), store.thread[init.id]);

		merge(store.thread[init.id], init);
		return patch;
	},
	ModifyThreadList(init, store, patch={}) {
		patch.threadList = copy(store.threadList);

		merge(store.threadList, init);
		return patch;
	},
	ModifyThreadFolders(init, store, patch={}) {
		patch.threadFolders = copy(store.threadFolders);

		merge(store.threadFolders, init);
		return patch;
	},
	ModifyLocation(init, store, patch={}) {
		patch.location = patch.location || {};
		patch.location[init.id] = extract(copy(init), store.location[init.id]);

		merge(store.location[init.id], init);
		return patch;
	},
	ModifyLocationList(init, store, patch={}) {
		patch.locationList = copy(store.locationList);

		merge(store.locationList, init);
		return patch;
	},
	ModifyLocationFolders(init, store, patch={}) {
		patch.locationFolders = copy(store.locationFolders);

		merge(store.locationFolders, init);
		return patch;
	},
	ModifyFolder(init, store, patch={}) {
		patch.folder = patch.folder || {};
		patch.folder[init.id] = extract(copy(init), store.folder[init.id]);

		merge(store.folder[init.id], init);
		return patch;
	},
	ModifyChapters(init, store, patch={}) {
		patch.chapters = copy(store.chapters);

		merge(store.chapters, init);
		return patch;
	},
	ModifyNote(init, store, patch={}) {
		init.modified = Date.now();
		patch.note = patch.note || {};
		patch.note[init.id] = extract(copy(init), store.note[init.id]);

		merge(store.note[init.id], init);
		return patch;
	},
	ModifyMeta(init, store, patch={}) {
		patch.meta = extract(copy(init), store.meta);

		merge(store.meta, init);
		return patch;
	},
	ModifyVisible(init, store, patch={}) {
		patch.visible = extract(copy(init), store.visible);

		merge(store.visible, init);
		return patch;
	},
	ModifySearch(init, store, patch={}) {
		patch.search = store.search;

		store.search = init;
		return patch;
	},
	ModifyPrintSettings(init, store, patch={}) {
		patch.printSettings = extract(copy(init), store.meta);

		merge(store.printSettings, init);
		return patch;
	},



	MoveThread({from, to}, store, patch={}) {
		var item, list, f;
		
		if (from.folder === undefined && to.folder === undefined) {
			list = copy(store.threadList);
			list.splice(to.index, 0, list.splice(from.index, 1)[0]);
			Actions.ModifyThreadList(list, store, patch);
		} else if (from.folder === to.folder) {
			f = store.threadFolders[from.folder];
			list = copy(store.folder[f].items);
			list.splice(to.index, 0, list.splice(from.index, 1)[0]);
			Actions.ModifyFolder({id: store.folder[f].id, items: list}, store, patch);
		} else {
			if (from.folder !== undefined) {
				f = store.threadFolders[from.folder];
				list = copy(store.folder[f].items);
				item = list.splice(from.index, 1)[0];
				list[list.length] = null;
				Actions.ModifyFolder({id: store.folder[f].id, items: list}, store, patch);
			} else {
				list = copy(store.threadList);
				item = list.splice(from.index, 1)[0];
				list[list.length] = null;
				Actions.ModifyThreadList(list, store, patch);
			}

			if (to.folder !== undefined) {
				f = store.threadFolders[to.folder];
				Actions.ModifyThread({id: item, folder: f}, store, patch);
				list = copy(store.folder[f].items);
				list.splice(to.index, 0, item);
				list[list.length] = null;
				Actions.ModifyFolder({id: store.folder[f].id, items: list}, store, patch);
			} else {
				if (from.folder !== undefined) 
					Actions.ModifyThread({id: item, folder: ''}, store, patch);
				list = copy(store.threadList);
				list.splice(to.index, 0, item);
				list[list.length] = null;
				Actions.ModifyThreadList(list, store, patch);
			}
		}
		return patch;
	},

	MoveLocation({from, to}, store, patch={}) {
		var item, list, f;

		if (from.folder === undefined && to.folder === undefined) {
			list = copy(store.locationList);
			list.splice(to.index, 0, list.splice(from.index, 1)[0]);
			Actions.ModifyLocationList(list, store, patch);
		} else if (from.folder === to.folder) {
			f = store.locationFolders[from.folder];
			list = copy(store.folder[f].items);
			list.splice(to.index, 0, list.splice(from.index, 1)[0]);
			Actions.ModifyFolder({id: store.folder[f].id, items: list}, store, patch);
		} else {
			if (from.folder !== undefined) {
				f = store.locationFolders[from.folder];
				list = copy(store.folder[f].items);
				item = list.splice(from.index, 1)[0];
				list[list.length] = null;
				Actions.ModifyFolder({id: store.folder[f].id, items: list}, store, patch);
			} else {
				list = copy(store.locationList);
				item = list.splice(from.index, 1)[0];
				list[list.length] = null;
				Actions.ModifyLocationList(list, store, patch);
			}

			if (to.folder !== undefined) {
				f = store.locationFolders[to.folder];
				Actions.ModifyLocation({id: item, folder: f}, store, patch);
				list = copy(store.folder[f].items);
				list.splice(to.index, 0, item);
				list[list.length] = null;
				Actions.ModifyFolder({id: store.folder[f].id, items: list}, store, patch);
			} else {
				if (from.folder !== undefined) 
					Actions.ModifyLocation({id: item, folder: ''}, store, patch);
				list = copy(store.locationList);
				item = list.splice(to.index, 0, item);
				list[list.length] = null;
				Actions.ModifyLocationList(list, store, patch);
			}
		}
		return patch;
	},



	DeleteScene(id, store, patch={}) {
		patch.scene = patch.scene || {};
		patch.meta = patch.meta || {};
		patch.scene[id] = store.scene[id];
		patch.meta.wc = store.meta.wc;
		patch.meta.sc = store.meta.sc;

		store.meta.sc--;
		store.meta.wc -= store.scene[id].wc;
		delete store.scene[id];
		return patch;
	},
	DeleteThread(id, store, patch={}) {
		var temp;
		patch.thread = patch.thread || {};
		patch.thread[id] = store.thread[id];
		
		// delete thread from scenes
		for (var key in store.scene) {
			if (store.scene[key].thread[id]) {
				let m = {id: key, thread: {}};
				m.thread[id] = null;
				Actions.ModifyScene(m, store, patch);
			}
		}
		// remove thread from any notes
		// remove any notes tagged solely by this thread
		for (var key in store.note) {
			if (store.note[key].tag[id]) {
				if (Object.keys(store.note[key].tag).length > 1) {
					let m = {id: key, tag: {}};
					m.tag[id] = null;
					Actions.ModifyNote(m, store, patch);
				} else Actions.DeleteNote(key, store, patch);
			}
		}
		temp = {};
		temp[id] = null;
		Actions.ModifyVisible(temp, store, patch);

		delete store.thread[id];
		return patch;
	},
	DeleteLocation(id, store, patch={}) {
		var temp;
		patch.location = patch.location || {};
		patch.scene = patch.scene || {};
		patch.location[id] = store.location[id];

		// delete scenes bound to location
		for (var key in store.scene) {
			if (store.scene[key].location === id) {
				patch.scene[key] = store.scene[key];
				delete store.scene[key];
			}
		}
		// remove location from any notes
		// remove any notes tagged solely by this location
		for (key in store.note) {
			if (store.note[key].tag[id]) {
				if (Object.keys(store.note[key].tag).length > 1) {
					let m = {id: key, tag: {}};
					m.tag[id] = null;
					Actions.ModifyNote(m, store, patch);
				} else Actions.DeleteNote(key, store, patch);
			}
		}
		temp = {};
		temp[id] = null;
		Actions.ModifyVisible(temp, store, patch);

		delete store.location[id];
		return patch;
	},
	DeleteNote(id, store, patch={}) {
		patch.note = patch.note || {};
		patch.note[id] = store.note[id];
		patch.meta = patch.meta || {};
		patch.meta.nc = store.meta.nc;

		delete store.note[id];
		store.meta.nc--;
		return patch;
	},

	ThreadScene({scene, thread}, store, patch={}) {

		var o = {id: scene, thread: {}};
		o.thread[thread] = true;
		Actions.ModifyScene(o, store, patch);

		o = {id: thread, time: copy(store.thread[thread].time)}
		o.time[store.scene[scene].utctime] = scene;
		Actions.ModifyThread(o, store, patch);

		return patch;
	},
	UnthreadScene({scene, thread}, store, patch={}) {

		var o = {id: scene, thread: {}};
		o.thread[thread] = null;
		Actions.ModifyScene(o, store, patch);

		o = {id: thread, time: copy(store.thread[thread].time)}
		o.time[store.scene[scene].utctime] = null;
		Actions.ModifyThread(o, store, patch);

		return patch;
	},


	Do(action, obj, store) {
		var patch, focus = null;
		if (action !== 'ModifySearch' && action !== 'ModifyVisible') {
			patch = Actions[action](obj, store);
			focus = patch.focus;

			store.past.push(
				LZW.compressToUTF16(
					JSON.stringify( patch )
				)
			);
			if (store.past.length > MAX_HISTORY) store.past.shift();
			if (store.future.length) store.future = [];
		} else Actions[action](obj, store);
		store.meta.modified = (new Date()).toISOString();
		return focus;
	},
	Undo(store) {
		var item;
		if (store.past.length) {
			item = JSON.parse(
				LZW.decompressFromUTF16(
					store.past.pop()
				)
			);
			store.future.push(
				LZW.compressToUTF16(
					JSON.stringify(
						extract(copy(item), store)
					)
				)
			);
			merge(store, item);
		}
		store.meta.modified = (new Date()).toISOString();
	},
	Redo(store) {
		var item;
		if (store.future.length) {
			item = JSON.parse(
				LZW.decompressFromUTF16(
					store.future.pop()
				)
			);
			store.past.push(
				LZW.compressToUTF16(
					JSON.stringify(
						extract(copy(item), store)
					)
				)
			);
			merge(store, item);
		}
		store.meta.modified = (new Date()).toISOString();
	}
};

module.exports = Actions;