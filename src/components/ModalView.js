const
	React = require('preact'),

	Style = {
		outer: {
			zIndex: 30,
			position: 'fixed',
			top: 0,
			left: 0,
			width: '100vw',
			height: '100vh',
			backgroundColor: 'rgba(0,0,0,0.5)',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center'
		},
		inner: {
			backgroundColor: '#000',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'flex-start',
			alignItems: 'center',
			padding: '1rem'
		}
	};

class ModalView extends React.Component {
	constructor(props, context) { 
		super(props, context);
	}

	render(props, state) {
		return (
			<div
				style={Style.outer}
				onClick={props.dismiss}
			>
				<div
					style={Style.inner}
					onClick={(e) => e.stopPropagation()}
				>
					{props.children}
				</div>
			</div>
		);
	}
}

module.exports = ModalView;