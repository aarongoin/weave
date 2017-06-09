const
	React = require('preact'),

	Style = {
		outer: {
			zIndex: '-5',
			position: 'absolute',
			left: '7rem',
			top: '2.5rem',
			minWidth: '100vw',
			minHeight: '100vh'
		},
		inner: {
			position: 'absolute',
			top: '2rem',
			left: 0,
			width: '100%',
			height: '100%'
		},
		location: {
			margin: '12rem 0',
			height: '2rem',
			backgroundColor: '#444444'
		},
		slice: {
			display: 'inline-block',
			margin: '0 8.9375rem',
			width: '0.125rem',
			height: '100%',
			backgroundColor: '#444444'
		}
	};


class WeaveBackground extends React.Component {
	constructor(props, context) {
		super(props, context);
	}

	shouldComponentUpdate(props, state, context) {
		return ((props.menuOffset !== this.props.menuOffset) ||
				(props.locations !== this.props.locations) ||
				(props.slices !== this.props.slices));
	}

	render(props, state) {
		return (
			<div
				data-is="WeaveBackground"
				style={Object.assign({}, Style.outer, {
					top: props.menuOffset,
					width: (props.slices * 18 + 2) + 'rem',
					height: (props.locations * 14 + 16) + 'rem'
				})}
			>
				<div style={Style.inner}>
					{Array(props.locations).fill(0).map((v, i) => <div style={Style.location}>&nbsp;</div>)}
				</div>
				<div style={Style.inner}>
					{Array(props.slices).fill(0).map((v, i) => <div style={Style.slice}>&nbsp;</div>)}
				</div>
			</div>
		)
	}
}

module.exports = WeaveBackground;