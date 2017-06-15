const
	React = require('preact'),
	Style = {
		space: {
			zIndex: 10,
			height: '5.25rem',
			width: '7rem',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'flex-end'
		},
		button: {
			margin: '0 3rem',
			padding: '0.2rem 0.6rem',
			marginBottom: '0.1rem',
			fontSize: '1.2rem',
			color: '#fff',
			border: 'none',
			outline: 'none',
			cursor: 'pointer',
			textAlign: 'center',
			borderRadius: '1rem',
			backgroundColor: 'rgba(0,0,0,0)'
		}
	};


module.exports = function(props) {
	return (
		<div style={(props.halfWidth ? Object.assign({}, Style.space, {width: '3.5rem'}) : Style.space)}>
			<button
				onclick={props.onClick}
				style={Style.button}
				onmouseenter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
				onmouseleave={e => e.target.style.backgroundColor = 'rgba(0,0,0,0)'}
			>+</button>
		</div>
	);
}