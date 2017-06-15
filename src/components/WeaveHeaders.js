const
	React = require('preact'),

	ThreadHeader = require('./ThreadHeader.js'),

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
			minHeight: '100vh'
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
			fontSize: '1.2rem',
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
			fontSize: '1.2rem',
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
			fontSize: '1.2rem',
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
			zIndex: 0,
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			height: '2rem',
			fontSize: '0.9rem',
			color: '#fff',
			border: 'none',
			backgroundColor: 'rgba(0,0,0,0)',
			width: '100%',
			border: 'none'
		}
	};


class WeaveHeaders extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			x: 0
		}

		Bind(this);
	}

	componentDidMount() {
		window.addEventListener('scroll', this.onScroll);
	}

	componentWillUnmount() {
		window.removeEventListener('scroll', this.onScroll);
	}

	render(props, state) {
		return (
			<div
				data-is="WeaveHeaders"
				style={Style.outer}
			>
				<div 
					data-is="ThreadHeaders"
					style={Object.assign({}, Style.threads, {
						left: state.x,
						height: (((props.threads.length+1)*14 + 16) + 'rem'),
						backgroundColor: 'rgba(0,0,0,0)',
						zIndex: 8
					})}
				>
					{([
						<div style={Object.assign({}, Style.thread, {height: '5rem'})}>
							<span
								style={Style.header}
							>&nbsp;</span>
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
			x: document.body.scrollLeft
		});
	}

	onThreadDrop(from, to) {
		this.context.do('MOVE_THREAD', {
			fromIndex: from,
			toIndex: to
		});
	}
}

module.exports = WeaveHeaders;