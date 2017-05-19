const
	LZW = require('./lz-string.js'),
	Source = require('./Sourcery.js');

var _projects = Source.getLocal('weave-projects');
	_store = undefined,
	_history = undefined;

if (_projects === null) {
	_projects = {
		active: 0, // index of active project
		all: [{ title: 'Welcome to Weave', totalWC: 4, storeSize: 0, historySize: 0 }]
	}
} else _projects = JSON.parse(_projects);

_store = Source.getLocal(_projects.active + '-store');
_history = Source.getLocal(_projects.active + '-history');

if (_store === null) {
	_store = {
		notes: {'welcomeToWeave': { id: 'welcomeToWeave', thread: '1', head: 'Welcome to Weave!', body: 'This is the place!', wc: 4 }},
		slices: [{datetime:'1999-10-26', notes: ['welcomeToWeave' ]}],
		threads: [{	id: '1', color: '#00cc66', name: 'The User'}]
	};
} else {
	_store = JSON.parse(LZW.decompressFromUTF16(_store));

	_store.slices.forEach(function
		(notes) {
		var i = notes.length;
		while (--i) {
			_store.notes[notes[i]] = LZW.decompressFromUTF16(Source.getLocal(notes[i]));
		}
	});
}

if (_history === null) {
	_history = {
		past: [],
		future: [],
		discard: [] // array of deleted notes id
	};
} else _history = JSON.parse(LZW.decompressFromUTF16(_history));


function _saveStore() {
	Source.setLocal(_projects.active + '-store', LZW.compressToUTF16(JSON.stringify(_store)))
	Source.setLocal(_projects.active + '-history', LZW.compressToUTF16(JSON.stringify(_history)))
	Source.setLocal('weave-projects', JSON.stringify(_projects))
}

const actions = {
	NEW_SLICE: {/* action={ ... atIndex } */
		do: function(action) {
			_store.slices.splice(action.atIndex, 0, {
				datetime: '',
				notes: []
			});
		},
		undo: function(action) {
			_store.slices.splice(action.atIndex, 1);
		}
	},
	REM_SLICE: {/* action={ ... atIndex } */
		do: function(action) {
			action.slice = _store.slices.splice(action.atIndex, 1);
			// TODO: remove any notes
		},
		undo: function(action) {
			_store.slices.splice(action.atIndex, 0, action.slice);
			// TODO: restore any notes
		}
	},
	NEW_NOTE: {/* action={ ... sliceIndex, threadID } */
		do: function(action) {
			state.slices[action.sliceIndex].notes.push({
				id: action.withId,
				thread: action.threadId,
				head: '',
				body: '',
				wc: 0
			});
		},
		undo: function(action) {
			Source.setLocal(action.withID); // remove note from localStorage
			_store.slices[action.sliceIndex].notes.pop();
		}
	},
	REM_NOTE: {/* action={ ... withID, sliceIndex } */
		do: function(action) {
			var notes = _store.slices[action.sliceIndex].notes,
				i = notes.indexOf(action.noteID);

			if (i === -1) return false;
			else {
				action.noteIndex = i;
				action.note = notes.splice(i, 1);
				_history.discard.push(action.noteID);
			}
		},
		undo: function(action) {
			_store.slices[action.sliceIndex].notes.splice(action.noteIndex, 0, action.note);
			_history.discard.pop();
		}
	},
	NEW_THREAD: {/* action={ ... } */
		do: function(action) {
			_store.threads.push({
				id: String(_store.threads.length),
				name: 'Name',
				color: '#666'
			});
		},
		undo: function(action) {
			_store.threads.pop();
		}
	},
	REM_THREAD: {/* action={ ... withID } */
		do: function(action) {
			var i = _store.threads.length;
			while (i--) if (_store.threads[i].id === action.withID) {
				action.index = i;
				action.thread = _store.threads.splice(i, 1);
				// TODO: remove any notes
				return true;
			}
			return false;
		},
		undo: function(action) {
			_store.threads.splice(action.index, 0, action.thread);
			// TODO: restore any notes

		}
	},
	MOD_SLICE_DATE: {/* action={ ... atIndex, newDate } */
		do: function(action) {
			action.oldDate = _store.slices[action.atIndex].datetime;
			_store.slices[action.atIndex].datetime = action.newDate;
		},
		undo: function(action) {
			_store.slices[action.atIndex].datetime = action.oldDate;
		}
	},
	MOV_SLICE: {/* action={ ... fromIndex, toIndex } */
		do: function(action) {
			_store.slices.splice(toIndex, 0, _store.slices.splice(fromIndex, 1));
		},
		undo: function(action) {
			_store.slices.splice(fromIndex, 0, _store.slices.splice(toIndex, 1));
		}
	},
	MOD_THREAD_NAME: {/* action={ ... atIndex, newName} */
		do: function(action) {
			action.oldName = _store.threads[action.atIndex].name;
			_store.threads[action.atIndex].name = action.newName;
		},
		undo: function(action) {
			_store.threads[action.atIndex].name = action.oldName;
		}
	},
	MOD_THREAD_COLOR: {/* action={ ... atIndex, newColor} */
		do: function(action) {
			action.oldColor = _store.threads[action.atIndex].color;
			_store.threads[action.atIndex].color = action.newColor;
		},
		undo: function(action) {
			_store.threads[action.atIndex].color = action.oldColor;
		}
	},
	MOV_THREAD: {/* action={ ... fromIndex, toIndex } */
		do: function(action) {
			_store.threads.splice(toIndex, 0, _store.threads.splice(fromIndex, 1));
		},
		undo: function(action) {
			_store.threads.splice(fromIndex, 0, _store.threads.splice(toIndex, 1));
		}
	},
	MOD_NOTE_HEAD: {/* action={ ... noteID, newHead} */
		do: function(action) {
			action.oldHead = _store.notes[noteID].head;
			_store.notes[noteID].head = action.newHead;
		},
		undo: function(action) {
			_store.notes[noteID].head = action.oldHead;
		}
	},
	MOD_NOTE_BODY: {/* action={ ... noteID, noteBody} */
		do: function(action) {
			// TODO: diff noteBody
		},
		undo: function(action) {
			// TODO: patch noteBody
		}
	},
	MOV_NOTE_SLICE: {/* action={ ... noteID, fromSliceIndex, toSliceIndex } */
		do: function(action) {
			var notes = _store.slices[action.fromSliceIndex].notes,
				i = notes.indexOf(noteID);

			if (i === -1) return false;
			else {
				_store.slices[action.toSliceIndex].notes.push(notes.splice(i, 1));
				return true;
			}
		},
		undo: function(action) {
			_store.slices[action.fromSliceIndex].notes.push(_store.slices[action.toSliceIndex].pop())
		}
	},
	MOV_NOTE_THREAD: {/* action={ ... noteID, toThreadID } */
		do: function(action) {
			action.fromThreadID = _store.notes[action.noteID].thread;
			_store.notes[action.noteID].thread = action.toThreadID;
		},
		undo: function(action) {
			_store.notes[action.noteID].thread = action.fromThreadID;
		}
	},
	NEW_PROJECT: {
		do: function(action) {
			// TODO
		},
		undo: function(action) {
			// TODO
		}
	},
	IMPORT_PROJECT: {/* action={ ... toThreadID } */
		do: function(action) {
			// TODO
		},
		undo: function(action) {
			// TODO
		}
	}
};

module.exports = {
	do: function(action) {
		actions[action.type].do(action);
		_history.past.push(action);
		_saveStore();
	},
	undo: function() {
		var action;
		if (_history.past.length) {
			action = _history.past.pop();
			actions[action.type].undo(action);
			_history.future.push(action);
			_saveStore();
		}
	},
	redo: function() {
		var a;
		if (_history.future.length) {
			a = _history.future.pop();
			actions[action.type].do(action);
			_history.past.push(action);
			_saveStore();
		}
	},
	getThread: function(withID) {
		var i = _store.threads.length;
		while (i--) if (_store.threads[i].id === withID) return _store.threads[i];
	},
	threadNotesInSlice: function(atIndex) {
		var out = [],
			slice = _store.slices[atIndex].notes,
			i = -1,
			n;

		while (++i < _store.threads.length) {
			n = -1;
			while (++n < slice.length) if (_store.notes[slice[n]].thread === _store.threads[i].id) {
				out.push(_store.notes[slice[n]]);
				break;
			}
			if (n === slice.length) out.push(null);
		}

		return out;
	},
	slices: _store.slices,
	threads: _store.threads,
	notes: _store.notes
};