const
	React = require('preact'),

	DeleteButton = require('./DeleteButton.js'),

	LocationLabel = require('./LocationLabel.js'),

	Bind = require('../bind.js'),
	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Style = {
		box: {
			maxWidth: '50rem',
			backgroundColor: '#fff',
			color: '#222',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-around',
			alignItems: 'stretch',
			width: '14rem',
			position: 'relative',
			top: '0.2rem',
			maxHeight: '13rem',
			margin: '0.2rem',
			border: '0 solid rgba(0,0,0,0)'
		},
		textarea: {
			fontSize: '1.1rem',
			margin: '0.75rem',
			maxHeight: '9rem'
		}
	};


class HeaderEditor extends React.Component {
	constructor(props, context) {
		super(props, context);

		Bind(this);
	}

	render(props, state) {
		return (
			<div
				style={Style.box}
			>
				<ExpandingTextarea
					style={Style.textarea}
					maxLength={250} 
					baseHeight="1.3rem"
					placeholder="Chapter/Scene Header"
					value={props.header}
					input={(e) => this.context.do('MODIFY_HEADER', {atIndex: props.id, newValue: e.target.value})}
					ref={el => this.el = el}
				/>
			</div>
		)
	}

}

module.exports = HeaderEditor;