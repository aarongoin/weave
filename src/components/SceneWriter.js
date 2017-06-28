const
	React = require('preact'),

	ExpandingTextarea = require('./ExpandingTextarea.js'),
	AppMenu = require('./AppMenu.js'),
	LocationLabel = require('./LocationLabel.js'),
	ThreadLabel = require('./ThreadLabel.js'),

	Bind = require('../bind.js'),

	Style = {
		box: {
			zIndex: '0',

			maxWidth: '50rem',

			backgroundColor: '#fff',
			color: '#222',

			marginTop: '1rem',
			marginLeft: 'auto',
			marginRight: 'auto',

			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-around',
			alignItems: 'stretch'
		},
		top: {
			padding: '0.5rem',

			display: 'flex',
			justifyContent: 'space-around'
		},
		thread: {
			color: '#fff',
			fontSize: '0.75rem',
			height: '1rem',

			borderRadius: '1rem',

			marginBottom: '0.5rem',
			marginRight: '0.5rem',
			padding: '0.25rem 0.5rem 0.2rem 0.5rem'
		},
		sceneHead: {
			color: '#222',
			fontSize: '1.3rem',

			margin: '0.5rem 1.5rem'
		},
		sceneBody: {
			color: '#222',
			fontSize: '1.1rem',
			margin: '0.5rem 1.5rem'
		},
		stats: {
			backgroundColor: '#fff',
			color: '#555',
			fontSize: '1rem',

			margin: '0',
			padding: '0.75rem 1.5rem 0.75rem 1.5rem',

			display: 'flex',
			flexDirection: 'row',
			justifyContent: 'space-around'
		},
		wc: {
			textAlign: 'right',

			display: 'inline-block',
			float: 'right'
		},
		statSticky: {
			bottom: '0',
			position: 'sticky'
		},
		statFree: {
			bottom: 'auto',
			position: 'inherit'
		},
		doneButton: {
			fontSize: '1rem',
			fontWeight: 'bold',
			border: 'none',
			outline: 'none',
			backgroundColor: 'rgba(0,0,0,0)',
			cursor: 'pointer'
		}
	},

	testWords = /[\w'’]+(?!\w*>)/igm; // capture words and ignore html tags or special chars

function count(text) {
	var wc = 0;

	testWords.lastIndex = 0;
	while (testWords.test(text)) wc++;
	return wc;
}

class SceneWriter extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			threadStyle: Object.assign({}, Style.thread, { backgroundColor: props.thread.c }),
			head: props.scene.h,
			body: props.scene.b,
			wc: props.scene.w,
			pages: Math.round(props.scene.wc / 275) || 1,
			pageOf: 1,
			statStyle: Style.statSticky
		}

		Bind(this);
	}

	render(props, state) {
		return (
			<div
				ref={this.mounted}
				style={Style.box}
			>
				<span style={Object.assign({}, Style.top, { backgroundColor: props.thread.c })}>
					<ThreadLabel
						value={props.thread.n}
						onChange={(e) => this.context.do('ModifyThreadName', {
							atIndex: props.sceneIndex,
							newName: e.target.value
						})}
					/>
					<LocationLabel
						value={props.scene.l}
						onInput={(value) => this.context.do('ModifySceneLocation', {
							sliceIndex: props.sliceIndex,
							sceneIndex: props.sceneIndex,
							newLocation: value
						})}
					/>
				</span>
				<ExpandingTextarea
					style={Style.sceneHead}
					maxLength="250"
					onInput={(e) => this.setState({head: e.target.value})}
					onChange={() => this.context.do('ModifySceneHead', 
						Object.assign({newHead: this.state.head}, props.coords)
					)}
					value={state.head}
					baseHeight="1.7em"
					placeholder="Title/Summary"
				/>
				<ExpandingTextarea
					ref={(el) => (this.body = el ? el.base : undefined)}
					style={Style.sceneBody}
					onInput={this.onBody}
					value={state.body}
					baseHeight="1.1em"
					placeholder="Body"
				/>
				<span style={Object.assign({}, Style.stats, state.statStyle)}>
					<span style={Style.wc}>
						{state.wc + ' words'}
					</span>
					<span>
						{state.pageOf + '/' + state.pages}
					</span>
					<button
						style={Style.doneButton}
						onClick={props.onDone}
					>done</button>
				</span>
			</div>
		)
	}

	componentDidMount() {
		window.addEventListener('scroll', this.onScroll);
		window.addEventListener('resize', this.onResize);

		window.scrollTo(0, 0);
	}

	componentWillUnmount() {
		window.removeEventListener('scroll', this.onScroll);
		window.removeEventListener('resize', this.onResize);
	}

	onBody(event) {
		this.setState({
			body: event.target.value,
			wc: count(event.target.value),
			pages: Math.round(this.state.wc / 275) || 1
		});
		this.onScroll();
		this.context.do('ModifySceneBody', Object.assign({newBody: this.state.body, wc: this.state.wc}, this.props.coords));
	}

	onScroll(event) {
		this.pageCount();
		this.stickyStats();
	}

	pageCount() {
		var t;
		if (this.body.clientHeight > window.innerHeight) {
			t = Math.abs(this.body.getBoundingClientRect().top);
			t = (t / this.body.clientHeight) * (this.state.pages + 1);
			t = Math.ceil(t);
			if (t > this.state.pages) t = this.state.pages;
		} else t = 1;
		this.setState({ pageOf: t });
	}

	stickyStats() {
		if (this.base.clientHeight > (window.innerHeight - 40)) {
			this.setState({ statStyle: Style.statSticky })
		} else {
			this.setState({ statStyle: Style.statFree })
		}
	}
}

module.exports = SceneWriter;