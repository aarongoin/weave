window.addEventListener('keyup', keyHandler);

module.exports = {
	keyHandler: function(event) {
		// check for edit/undo
		if (!event.shiftKey && ((event.metaKey && !event.ctrlKey) || event.ctrlKey)) {
			if (event.key === 'z' && store.canUndo) {
				undoHistory();
				event.preventDefault();
			} else if (event.key === 'y' && store.canRedo) {
				redoHistory();
				event.preventDefault();
			}
		} else switch (event.key) {
			case 'ArrowUp':
				// TODO - handle based on app view state
				break;
			case 'ArrowDown':
				// TODO - handle based on app view state
				break;
			case 'ArrowLeft':
				// TODO - handle based on app view state
				break;
			case 'ArrowRight':
				// TODO - handle based on app view state
				break;
			default:
				break;
		}
	};
};