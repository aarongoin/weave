const
	React = require('preact'),

	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Bind = require('../bind.js'),
	Style = {
		locationHeader: {
			zIndex: '10',
			width: '7rem',
			color: '#fff',
			backgroundColor: '#777777',
			outline: 'none',
			fontSize: '0.9rem',
			border: 'none',
			textAlign: 'center',
			paddingTop: '0.5rem'
		}
	};


class LocationHeader extends React.Component {
	constructor(props, context) {
		super(props, context);
		this.state = {
			value: props.value
		};
	}

	shouldComponentUpdate(props, state, context) {
		return ((state !== this.state) ||
				(props.value !== this.props.value));
	}

	render(props, state) {
		return (
			<ExpandingTextarea
				type="text"
				style={Style.locationHeader}
				maxLength="24"
				baseHeight="0.9rem"
				value={state.value}
				placeholder="Location"
				input={(event) => this.setState({value: event.target.value})}
				change={(event) => this.context.do('MODIFY_LOCATION_NAME', {
					atIndex: this.props.id,
					newName: event.target.value
				})}
			/>
		)
	}
}

module.exports = LocationHeader;