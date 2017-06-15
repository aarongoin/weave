const
	React = require('preact'),

	Style = {
		btn: {
			position: 'relative',
			zIndex: 25,
			width: '2rem',
			height: '2rem',
			borderRadius: '1rem',

			border: 'none',
			outline: 'none',
			backgroundColor: '#eee',

			color: '#f00',
			fontSize: '1.2rem',
			fontWeight: 'bold',
			transition: 'color 1s',

			cursor: 'pointer'
		}
	};

class DeleteButton extends React.Component {
	constructor(props, context) {
		super(props, context);
	}

	render(props) {
		return (
			<button
				style={props.style ? Object.assign({}, Style.btn, props.style) : Style.btn}
				onClick={(e) => {
					e.target.style.color = '#f00';
					if (this.timer) {
						clearTimeout(this.timer);
						this.timer = undefined;
					}
				}}
				onMouseDown={(e) => {
					e.target.style.color = "#777";
					if (props.onHold) this.timer = setTimeout(props.onHold, 1000, e);
				}}
			>X</button>
		);
	}
}

module.exports = DeleteButton;