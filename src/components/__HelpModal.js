const
	React = require('preact'),

	ModalView = require('./ModalView.js'),

	Bind = require('../bind.js'),

	Style = {
		
	};

class HelpModal extends React.Component {
	constructor(props, context) { 
		super(props, context);

		Bind(this);
	}

	render(props, state) {
		const select = this.select;

		return (
			<ModalView
				dismiss={props.onDone}
			>
				<span>
					<h1>Welcome to Weave</h1><h2>v0.9.0alpha</h2>
				</span>
			</ModalView>
		);
	}
}

module.exports = HelpModal;