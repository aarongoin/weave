require('./polyfills.js');
(function(){

	const
		React = require('preact'),
		App = require('./App.js');

	React.render(<App/>, document.body);
})();