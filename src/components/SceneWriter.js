const
	React = require('preact'),

	ExpandingTextarea = require('./ExpandingTextarea.js'),
	AppMenu = require('./AppMenu.js'),
	ThreadLabel = require('./ThreadLabel.js'),

	Bind = require('../bind.js'),

	Style = {
		box: {
			zIndex: '0',

			maxWidth: '50rem',

			backgroundColor: '#fff',
			color: '#222',

			marginLeft: 'auto',
			marginRight: 'auto',
			paddingTop: '1.5rem',

			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-around',
			alignItems: 'stretch'
		},
		top: {
			paddingLeft: '1.5rem',
			paddingRight: '1.5rem',

			display: 'flex',
			flexWrap: 'wrap',
			justifyContent: 'flex-start'
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
			fontSize: '1.7rem',

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
			threadStyle: Object.assign({}, Style.thread, { backgroundColor: props.thread.color }),
			head: props.scene.head,
			body: props.scene.body,
			wc: props.scene.wc,
			pages: 1,
			pageOf: 1,
			statStyle: Style.statSticky
		}

		Bind(this);
	}

	render(props, state) {
		return (
			<div
				ref={this.mounted}
				style={Object.assign({marginTop: props.menuOffset === '0rem' ? '1rem' : props.menuOffset}, Style.box)}
			>
				<span style={Style.top}>
					<ThreadLabel
						style={state.threadStyle}
						value={props.thread.name}
						onChange={(e) => this.context.do('MODIFY_THREAD_NAME', {
							atIndex: props.scene.thread,
							newName: e.target.value
						})}
					/>
					{/*<span style={state.threadStyle}>
						{'+'}
					</span>*/}
				</span>
				<ExpandingTextarea
					style={Style.sceneHead}
					maxLength="250"
					input={(e) => this.setState({head: e.target.value})}
					change={() => this.context.do('MODIFY_NOTE_HEAD', 
						Object.assign({newHead: this.state.head}, props.coords)
					)}
					value={state.head}
					baseHeight="1.7em"
					placeholder="Title/Summary"
				/>
				<ExpandingTextarea
					ref={this.bodyMounted}
					style={Style.sceneBody}
					input={this.onBody}
					change={() => this.context.do('MODIFY_NOTE_BODY', 
						Object.assign({newBody: state.body, wc: state.wc}, props.coords)
					)}
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
	}

	mounted(element) {
		this.el = element;
	}

	bodyMounted(element) {
		this.body = element;
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
		if (this.el.clientHeight > (window.innerHeight - 40)) {
			this.setState({ statStyle: Style.statSticky })
		} else {
			this.setState({ statStyle: Style.statFree })
		}
	}
}

module.exports = SceneWriter;