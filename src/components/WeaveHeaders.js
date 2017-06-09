const
	React = require('preact'),

	LocationHeader = require('./LocationHeader.js'),
	SliceHeader = require('./SliceHeader.js'),

	Bind = require('../bind.js'),

	Style = {
		outer: {
			position: 'absolute',
			left: 0,
			minWidth: '100vw',
			minHeight: '100vh'
		},
		locations: {
			position: 'absolute',
			top: '0.25rem',
			width: '7rem',
			minHeight: '100vh',
			paddingTop: '2rem'
		},
		location: {
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'flex-end',
			position: 'relative',
			height: '14rem',
		},
		scenes: {
			zIndex: '11',
			position: 'absolute',
			backgroundColor: "#111",
			left: 0,
			height: '2rem',
			paddingLeft: '7rem',
			minWidth: '100vw'
		},
		sliceButton: {
			margin: '0 1.375rem',
			fontSize: '0.9rem',
			color: '#fff',
			border: 'none',
			outline: 'none',
			cursor: 'pointer',
			width: '1.25rem',
			height: '1.25rem',
			textAlign: 'center',
			borderRadius: '1rem',
			backgroundColor: 'rgba(0,0,0,0)'
		},
		firstSliceButton: {
			margin: '0 0.375rem',
			fontSize: '0.9rem',
			color: '#fff',
			border: 'none',
			outline: 'none',
			cursor: 'pointer',
			width: '1.25rem',
			height: '1.25rem',
			textAlign: 'center',
			borderRadius: '1rem',
			backgroundColor: 'rgba(0,0,0,0)'
		},
		threadBtn: {
			height: '2rem',
			fontSize: '0.9rem',
			color: '#fff',
			border: 'none',
			outline: 'none',
			cursor: 'pointer',
			textAlign: 'center',
			padding: '0.5rem 0.5rem',
			backgroundColor: 'rgba(0,0,0,0)',
			width: '100%'
		}
	};


class WeaveHeaders extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			x: 0,
			y: 0
		}

		Bind(this);
	}

	componentDidMount() {
		window.addEventListener('scroll', this.onScroll);
	}

	componentWillUnmount() {
		window.removeEventListener('scroll', this.onScroll);
	}

	shouldComponentUpdate(props, state) {
		return ((props.windowWidth !== this.props.windowWidth) ||
				(props.locations !== this.props.locations) ||
				(props.slices !== this.props.slices) ||
				(state !== this.state))
	}

	render(props, state) {
		return (
			<div
				data-is="WeaveHeaders"
				style={Object.assign({}, Style.outer, state.style)}
			>
				<div
					data-is="SliceHeaders"
					style={Object.assign({}, Style.scenes, { top: state.y, width: ((props.slices.length*18 + 2) + 'rem')  })}
				>
					{[
						<button
							onclick={(event) => this.context.do('NEW_SLICE', {atIndex: 0})}
							style={Style.firstSliceButton}
							onmouseenter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
							onmouseleave={e => e.target.style.backgroundColor = 'rgba(0,0,0,0)'}
						>+</button>
					].concat(props.slices.map((slice, i) => 
						<div style={{display: 'inline', width: '18rem'}}>
							<SliceHeader
								id={i}
								value={slice.datetime}
							/>
							<button
								onclick={(event) => this.context.do('NEW_SLICE', {atIndex: i+1})}
								style={Style.sliceButton}
								onmouseenter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
								onmouseleave={e => e.target.style.backgroundColor = 'rgba(0,0,0,0)'}
							>+</button>
						</div>
					))}
				</div>
				<div 
					data-is="LocationHeaders"
					style={Object.assign({}, Style.locations, {
						left: state.x,
						height: ((props.locations.length*14 + 16) + 'rem'),
						backgroundColor: (props.windowWidth < 700) ? 'rgba(0,0,0,0)' : '#111',
						zIndex: (props.windowWidth < 700) ? 8 : 10 })}
				>
					{((props.locations.map((location, i) =>
						<LocationHeader
							id={i}
							value={location}
							onDrag={(id) => this.dragging = id}
							onDrop={this.onLocationDrop}
						/>
					)).concat(
						[<div style={Style.location}>
							<button
								onclick={(event) => this.context.do('NEW_LOCATION')}
								style={Style.threadBtn}
								onmouseenter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
								onmouseleave={e => e.target.style.backgroundColor = 'rgba(0,0,0,0)'}
							>+</button>
						</div>]
					))}
				</div>
			</div>
		)
	}

	onScroll() {
		this.setState({
			x: document.body.scrollLeft,
			y: document.body.scrollTop
		});
	}

	onLocationDrop(toIndex) {
		this.context.do('MOVE_LOCATION', {
			fromIndex: this.dragging,
			toIndex: toIndex
		});
	}
}

module.exports = WeaveHeaders;