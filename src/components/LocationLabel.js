const
	React = require('preact'),

	Style = {
		editor: {
			fontSize: '0.9rem',
			padding: '0.5rem',
			height: '1rem',
			border: 'none',
			outline: 'none',
			background: 'rgba(0,0,0,0)',
			color: '#fff'
		}
	};

function MeasureText(text) {
	return text.length ? (text.length * 1.1) : 5;
}

class LocationLabel extends React.Component {
	constructor(props, context) {
		super(props, context);
	}

	render(props, state, context) {
		return (
			<input
				type="text"
				style={props.style ? Object.assign({}, Style.editor, props.style) : Style.editor}
				maxLength="50"
				size={20}
				value={props.value}
				placeholder="location"
				onInput={(event) => {
					props.onInput(event.target.value);
				}}
			/>
		);
	}
}

module.exports = LocationLabel;