const
	React = require('preact'),

	ThreadHeader = require('./ThreadHeader.js'),
	SliceHeader = require('./SliceHeader.js'),

	Colors = require('../colors.js'),
	Bind = require('../bind.js'),

	Style = {
		outer: {
			position: 'absolute',
			left: 0,
			minWidth: '100vw',
			minHeight: '100vh'
		},
		threads: {
			position: 'absolute',
			top: '0.25rem',
			width: '7rem',
			minHeight: '100vh',
			paddingTop: '2rem'
		},
		thread: {
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'flex-end',
			position: 'relative',
			height: '13.75rem',
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
		},
		header: {
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			height: '2rem',
			fontSize: '0.9rem',
			color: '#fff',
			border: 'none',
			backgroundColor: '#000',
			width: '100%',
			border: 'none'
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
				(props.threads !== this.props.threads) ||
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
					data-is="ThreadHeaders"
					style={Object.assign({}, Style.threads, {
						left: state.x,
						height: (((props.threads.length+1)*14 + 16) + 'rem'),
						backgroundColor: (props.windowWidth < 700) ? 'rgba(0,0,0,0)' : '#111',
						zIndex: (props.windowWidth < 700) ? 8 : 10 })}
				>
					{([
						<div style={Object.assign({marginBottom: '0.25rem'}, Style.thread)}>
							<span
								style={Style.header}
							>Header</span>
						</div>
					].concat((props.threads.map((thread, i) =>
						<ThreadHeader
							id={i}
							thread={thread}
							onDrag={(id) => this.dragging = id}
							onDrop={this.onThreadDrop}
						/>
					)).concat(
						[<div style={Style.thread}>
							<button
								onclick={(event) => this.context.do('NEW_THREAD', {color: Colors.random()})}
								style={Style.threadBtn}
								onmouseenter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
								onmouseleave={e => e.target.style.backgroundColor = 'rgba(0,0,0,0)'}
							>+</button>
						</div>]
					)))}
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

	onThreadDrop(toIndex) {
		this.context.do('MOVE_THREAD', {
			fromIndex: this.dragging,
			toIndex: toIndex
		});
	}
}

module.exports = WeaveHeaders;