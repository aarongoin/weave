window.addEventListener('keyup', keyHandler);

const
	context = 0,
	handlers = [
		function(event) {
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
		}
	],
	keyHandler = function(event) {
		// check context
		
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



module.exports = {
	newContext: function(h) {
		handlers.push(h);
		return
	}
	useContext: function(c) {
		context = c;
	}
};