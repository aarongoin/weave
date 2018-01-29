const
	React = require('preact'),

	Style = {
		outer: {
			zIndex: 15,
			position: 'fixed',
			top: 0,
			left: 0,
			width: '100vw',
			height: '100vh',
			backgroundColor: 'rgba(0,0,0,0.6)',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			overflow: 'scroll'
		},
		inner: {
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'flex-start',
			alignItems: 'center',
			maxHeight: '100vh',
			padding: '1.5rem',
			marginTop: '1rem',
			overflow: 'scroll'
			//border: 'solid thick #999'
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
					style={Object.assign({}, Style.inner, props.innerStyle || {})}
					onClick={(e) => e.stopPropagation()}
				>
					{props.children}
				</div>
			</div>
		);
	}
}

module.exports = ModalView;