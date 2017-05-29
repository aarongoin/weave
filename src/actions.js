module.exports = {
	NEW_SLICE: {/* action={ ... atIndex } */
		do: function(action, store) {
			store.slices.splice(action.atIndex, 0, {
				datetime: '',
				notes: []
			});
		},
		undo: function(action, store) {
			store.slices.splice(action.atIndex, 1);
		}
	},
	DELETE_SLICE: {/* action={ ... atIndex } */
		do: function(action, store) {
			action.slice = store.slices.splice(action.atIndex, 1);
			// TODO: remove any notes
		},
		undo: function(action, store) {
			store.slices.splice(action.atIndex, 0, action.slice);
			// TODO: restore any notes
		}
	},
	NEW_NOTE: {/* action={ ... sliceIndex, locationID } */
		do: function(action, store) {
			state.slices[action.sliceIndex].notes.push({
				id: action.withId,
				location: action.locationId,
				head: '',
				body: '',
				wc: 0
			});
		},
		undo: function(action, store) {
			Source.setLocal(action.withID); // remove note from localStorage
			store.slices[action.sliceIndex].notes.pop();
		}
	},
	DELETE_NOTE: {/* action={ ... withID, sliceIndex } */
		do: function(action, store) {
			var notes = store.slices[action.sliceIndex].notes,
				i = notes.indexOf(action.noteID);

			if (i === -1) return false;
			else {
				action.noteIndex = i;
				action.note = notes.splice(i, 1);
			}
		},
		undo: function(action, store) {
			store.slices[action.sliceIndex].notes.splice(action.noteIndex, 0, action.note);
		}
	},
	NEW_LOCATION: {/* action={ ... } */
		do: function(action, store) {
			store.locations.push({
				id: String(store.locations.length),
				name: 'Name',
				color: '#666'
			});
		},
		undo: function(action, store) {
			store.locations.pop();
		}
	},
	DELETE_LOCATION: {/* action={ ... withID } */
		do: function(action, store) {
			var i = store.locations.length;
			while (i--) if (store.locations[i].id === action.withID) {
				action.index = i;
				action.location = store.locations.splice(i, 1);
				// TODO: remove any notes
				return true;
			}
			return false;
		},
		undo: function(action, store) {
			store.locations.splice(action.index, 0, action.location);
			// TODO: restore any notes

		}
	},
	MODIFY_SLICE_DATE: {/* action={ ... atIndex, newDate } */
		do: function(action, store) {
			action.oldDate = store.slices[action.atIndex].datetime;
			store.slices[action.atIndex].datetime = action.newDate;
		},
		undo: function(action, store) {
			store.slices[action.atIndex].datetime = action.oldDate;
		}
	},
	MODIFY_LOCATION_NAME: {/* action={ ... atIndex, newName} */
		do: function(action, store) {
			action.oldName = store.locations[action.atIndex].name;
			store.locations[action.atIndex].name = action.newName;
		},
		undo: function(action, store) {
			store.locations[action.atIndex].name = action.oldName;
		}
	},
	MODIFY_LOCATION_COLOR: {/* action={ ... atIndex, newColor} */
		do: function(action, store) {
			action.oldColor = store.locations[action.atIndex].color;
			store.locations[action.atIndex].color = action.newColor;
		},
		undo: function(action, store) {
			store.locations[action.atIndex].color = action.oldColor;
		}
	},
	MOVE_LOCATION: {/* action={ ... fromIndex, toIndex } */
		do: function(action, store) {
			store.locations.splice(toIndex, 0, store.locations.splice(fromIndex, 1));
		},
		undo: function(action, store) {
			store.locations.splice(fromIndex, 0, store.locations.splice(toIndex, 1));
		}
	},
	MODIFY_NOTE_HEAD: {/* action={ ... noteID, newHead} */
		do: function(action, store) {
			action.oldHead = store.notes[noteID].head;
			store.notes[noteID].head = action.newHead;
		},
		undo: function(action, store) {
			store.notes[noteID].head = action.oldHead;
		}
	},
	MODIFY_NOTE_BODY: {/* action={ ... noteID, noteBody} */
		do: function(action, store) {
			// TODO: diff noteBody
		},
		undo: function(action, store) {
			// TODO: patch noteBody
		}
	},
	MOVE_NOTE_SLICE: {/* action={ ... noteID, fromSliceIndex, toSliceIndex } */
		do: function(action, store) {
			var notes = store.slices[action.fromSliceIndex].notes,
				i = notes.indexOf(noteID);

			if (i === -1) return false;
			else {
				store.slices[action.toSliceIndex].notes.push(notes.splice(i, 1));
				return true;
			}
		},
		undo: function(action, store) {
			store.slices[action.fromSliceIndex].notes.push(store.slices[action.toSliceIndex].pop())
		}
	},
	MOVE_NOTE_LOCATION: {/* action={ ... noteID, toThreadID } */
		do: function(action, store) {
			action.fromThreadID = store.notes[action.noteID].location;
			store.notes[action.noteID].location = action.toThreadID;
		},
		undo: function(action, store) {
			store.notes[action.noteID].location = action.fromThreadID;
		}
	}
};