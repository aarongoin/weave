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
			minHeight: '100vh',
			pointerEvents: 'none'
		},
		threads: {
			position: 'absolute',
			top: '0.25rem',
			width: '8rem',
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
			position: 'absolute',
			backgroundColor: "#111",
			left: 0,
			height: '2rem',
			paddingLeft: '8rem',
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
						backgroundColor: 'rgba(0,0,0,0)'
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
								onClick={(event) => this.context.do('NewThread', {color: event.target.style.backgroundColor})}
								style={Style.threadBtn}
								onMouseenter={e => e.target.style.backgroundColor = Colors.random()}
								onMouseleave={e => e.target.style.backgroundColor = 'rgba(0,0,0,0)'}
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
		this.context.do('MoveThread', {
			fromIndex: from,
			toIndex: to
		});
	}
}

module.exports = WeaveHeaders;