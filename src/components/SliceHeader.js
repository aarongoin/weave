const
	React = require('preact'),

	NoteView = require('./NoteView.js'),

	Bind = require('../bind.js'),
	Style = {
		sliceHeader: {
			zIndex: '11',
			height: '1.5rem',
			color: '#fff',
			maxWidth: '14rem',
			backgroundColor: '#777777',
			outline: 'none',
			fontSize: '0.9rem',
			margin: '0 auto',
			border: 'none',
			textAlign: 'center',
			padding: '0.25rem'
		},
		slice: {
			display: 'inline-flex',
			justifyContent: 'center',
			alignItems: 'center',
			width: '14rem',
			height: '100%'
		}
	};

function MeasureText(text) {
	return text.length ? (text.length * 1.1) : 5;
}

class SliceHeader extends React.Component {
	constructor(props, context) {
		super(props, context);
		this.state = {
			value: props.value
		};

		Bind(this);
	}

	componentWillReceiveProps(props) {
		this.setState({value: props.value});
	}

	shouldComponentUpdate(props, state, context) {
		return ((state !== this.state) ||
				(props.value !== this.props.value));
	}

	render(props, state) {
		return (
			<div style={Style.slice}>
				<input
					type="text"
					style={Style.sliceHeader}
					maxLength="24"
					size={MeasureText(state.value)}
					value={state.value}
					placeholder="time"
					oninput={(event) => this.setState({value: event.target.value})}
					onchange={this.onChange}
				/>
			</div>
		)
	}

	onChange(event) {
		this.context.do('MODIFY_SLICE_DATE', {
			atIndex: this.props.id,
			newDate: event.target.value
		});
	}
}

module.exports = SliceHeader;