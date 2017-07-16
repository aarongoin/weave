const
	React = require('preact'),

	Style = {
		outer: {
			zIndex: '-5',
			position: 'absolute',
			left: 0,
			top: '0.5rem',
			minWidth: '100vw',
			minHeight: '100vh'
		},
		inner: {
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%'
		},
		thread: {
			margin: '12rem 0',
			height: '2rem',
			opacity: '0.3'
		},
		slice: {
			display: 'inline-block',
			margin: '0 9.4375rem',
			width: '0.125rem',
			height: '100%',
			backgroundColor: '#444444'
		}
	};


class WeaveBackground extends React.Component {
	constructor(props, context) {
		super(props, context);
	}

	render(props, state) {
		return (
			<div
				data-is="WeaveBackground"
				style={Object.assign({}, Style.outer, {
					top: props.menuOffset,
					width: ((props.slices + 1) * 21 -5) + 'rem',
					height: ((props.threads.length + 1) * 14 + 16) + 'rem'
				})}
			>
				<div style={Object.assign({}, Style.inner, {left: '9rem', width: 'auto'})}>
					{Array(props.slices).fill(0).map((v, i) => <div style={Style.slice}>&nbsp;</div>)}
				</div>
				<div style={Style.inner}>
					<div
						style={Object.assign({}, Style.thread, {
							backgroundColor: '#000',
							margin: '3.25rem 0'
						})}
					>&nbsp;</div>
					{props.threads.map((thread, i) => (
						<div
							style={Object.assign({}, Style.thread, {
								backgroundColor: thread.c
							})}
						>&nbsp;</div>
					))}
				</div>
			</div>
		)
	}
}

module.exports = WeaveBackground;