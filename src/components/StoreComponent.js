const
	React = require('preact'),

	Actions = require('./actions.js'),
	LZW = require('lz-string'),
	Source = require('./Sourcery.js'),

	StoreActions = Object.keys(Actions).reduce(bindActions, {}),

	Store = Source.getLocal('weave-project') ?
		JSON.parse(LZW.decompressFromUTF16(Source.getLocal('weave-project')))
	:
		{
			max: 20,
			past: [],
			present: {
				title: 'Welcome to Weave',
				author: 'Aaron Goin',
				wordCount: 4,
				sceneCount: 1,
				headers: ['Chapter One'],
				threads: [{ name: 'Harry Potter', color: '#f00', scenes: [{ head: 'Introduction to Weave', body: 'Welcome to Weave!', wc: 4 , location: 'Bedroom'}] }]
			},
			future: []
		};

function bindActions(actions, key) {
	const f = Actions[key];

	actions[key] = function(args) {
		Store.past.push(Store.present);
		if (!f.call(Store.present, args)) Store.past.pop();
	}
	return actions;
}

function Save() {
	Source.setLocal('weave-project', LZW.compressToUTF16(JSON.stringify(Store)));
}

function undo() {
	if (store.past.length) {
		store.future.push(present);
		store.present = store.past.pop()
	}
}

function redo() {
	if (store.future.length) {
		store.past.push(store.present);
		store.present = future.pop();

		if (store.past.length > store.max) store.past.shift();
	}
}

function NotEqual(orig, mod) {
	for (var key in orig) {
		if (orig[key] !== mod[key]) return true;
	}
	return false;
}

function Bind(instance) {
	var proto = instance.constructor.prototype,
		keys = Object.getOwnPropertyNames(proto),
		key;
	while (key = keys.pop()) if (typeof proto[key] === 'function' && key !== 'constructor') instance[key] = instance[key].bind(instance);
}

class StoreComponent extends React.Component {
	constructor(props, context, bind) {
		super(props, context);

		if (bind) Bind(this);

		this.actions = StoreActions;
	}

	shouldComponentUpdate(props, state) {
		return  (props && NotEqual(this.props, props)) ||
				(state && NotEqual(this.state, state));
	}
}

module.exports = {
	StoreComponent: StoreComponent,
	Store: Store
};