var
	historyLength = sessionStorage.getItem('historyLength') || 0,
	historyIndex = sessionStorage.getItem('historyIndex') || 0,
	canRedo = (historyIndex < historyLength),
	canUndo = (historyIndex > 0);

module.exports = {
	addToHistory: function(change) {
		// check for new branch in history
		// (ie. old chnages that have been undone, and are now being invalidated by a new change)
		if (historyIndex === historyLength) {
			sessionStorage.setItem(String(historyLength), change);
			sessionStorage.setItem('historyLength', String(++historyLength));
		} else while (historyLength-- > historyIndex) {
			// clear out irrelevant history branch
			sessionStorage.removeItem(String(historyLength));
		}
		sessionStorage.setItem('historyIndex', String(++historyIndex));

		canRedo = false;
		canUndo = true;
	},

	undoHistory: function() {
		// TODO - actually rewind change
		sessionStorage.setItem('historyIndex', String(--historyIndex));
		canRedo = true;
		canUndo = (historyIndex > 0);
	},

	redoHistory: function() {
		// TODO - actually redo change
		sessionStorage.setItem('historyIndex', String(++historyIndex));
		canUndo = true;
		canRedo = (historyIndex < historyLength);
	}
};