module.exports = {
	/*get: function(key) {

	},
	set: function(key, value) {

	},*/
	checkStatus: function(serverURL) {
		var status = {
			local: false,
			online: false
		}
		// check if localStorage exists
		try {
			window.localStorage.setItem('checkStatus', 'a');
			window.localStorage.getItem('checkStatus');
			window.localStorage.removeItem('checkStatus');
			status.local = true;
		} catch(e) {}
		// check if online
		status.online = window.navigator.onLine;

		return status;
	},
	getLocal: function(key) {
		return window.localStorage.getItem(key);
	},
	setLocal: function(key, value) {
		var success = true;
		if (value === undefined) window.localStorage.removeItem(key);
		else try {
			window.localStorage.setItem(key, value);
		} catch (e) { // localStorage is full
			success = false;
		}
		return success;
	}
};