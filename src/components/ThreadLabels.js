const
	React = require('preact'),

	Style = {
		labels: {
			zIndex: '5',
			display: 'block',
			marginTop: '3rem',
			width: '7rem',
			position: 'absolute',
			top: '0',
			left: '0',
			backgroundColor: 'rgba(40,40,40,0.9)'
		},

		space: {
			height: '14rem',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'flex-end'
		},

		newThread: {
			minHeight: '2rem',
			height: '2rem',
			fontSize: '0.9rem',
			color: '#fff',
			border: 'none',
			outline: 'none',
			cursor: 'pointer',
			width: '100%',
			backgroundColor: 'rgba(0,0,0,0)',
			textAlign: 'center',
			padding: '0 0.5rem'
		},

		threadBtn: {
			minHeight: '2rem',
			fontSize: '0.8rem',
			color: '#fff',
			border: 'none',
			outline: 'none',
			cursor: 'pointer',
			textAlign: 'center',
			padding: '0.5rem 0.5rem',
			width: '100%'
		}
	};


class ThreadLabels extends React.Component {
	constructor(props, context) {
		super(props);

		this.state = {
			height: window.innerHeight
		}

	}

	componentDidUpdate() {
		var h = this.el.offsetHeight + this.el.offsetTop,
			i = (h > window.innerHeight) ? h : window.innerHeight;
		if (this.state.height !== i) this.setState({ height: i });
	}

	render(props, state) {
		var threads = [],
			i = -1;

		while (++i < props.threads.length) threads.push(
			<div style={Style.space}>
				<button 
					style={Object.assign(Style.threadBtn, { backgroundColor: props.threads[i].color })}
					data-thread={i}
				>{props.threads[i].name}</button>
			</div>
		);

		return (
			<div style={Object.assign(Style.labels, { left: props.scrollX, height: state.height + 'px' })}>
				{threads}
				<div
					style={Style.space}
					ref={el => this.el = el}
				>
					<button
						onclick={props.newThread}
						style={Style.newThread}
						onmouseenter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
						onmouseleave={e => e.target.style.backgroundColor = 'rgba(0,0,0,0)'}
					>+</button>
				</div>
			</div>
		)
	}
}

module.exports = ThreadLabels;