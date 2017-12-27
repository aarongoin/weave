const
	React = require('preact'),

	Bind = require('../bind.js'),

	Style = {
		scrollWindow: {
			overflow: 'scroll'
		}
	};

class ScrollingView extends React.Component {
	constructor(props, context) {
		super(props, context);
		Bind(this);
	}

	render(props, state, context) {
		return (
			<div
				style={Object.assign({}, Style.scrollWindow, props.style)}
				onmouseover={() => (document.body.style.overflow = 'hidden')}
				onmouseleave={() =>(document.body.style.overflow = 'scroll')}
			>
				{props.children}
			</div>
		);
	}
}

module.exports = ScrollingView;