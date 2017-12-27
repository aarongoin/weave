const
	React = require('preact'),

	Bind = require('../bind.js');

class BufferedText extends React.Component {
	constructor(props, context) {
		super(props, context);

		Bind(this);
	}

	render(props, state, context) {
		// props: time, 
		// capture onInput and buffer changes
		var input = props.children[0];

		this.afterInput = input.attributes.onInput;
		input.attributes.onInput = this.onInput;

		return input;
	}

	shouldComponentUpdate(props, state, context) {
		return this.timer ? false : true;
	}

	onInput(event) {
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(this.onTimer, this.props.time || 500, event);
		this.afterInput(event);
	}

	onTimer(event) {
		this.props.onInput(event);
		this.timer = undefined;
	}
}

module.exports = BufferedText;