const
	React = require('preact'),

	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Bind = require('../bind.js'),

	Style = {
		box: {
			zIndex: '0',

			maxWidth: '50rem',

			backgroundColor: '#fff',
			color: '#222',

			marginLeft: 'auto',
			marginRight: 'auto',
			marginTop: '3rem',
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

			borderRadius: '1rem',

			marginBottom: '0.5rem',
			marginRight: '0.5rem',
			padding: '0.25rem 0.5rem 0.2rem 0.5rem'
		},
		noteHead: {
			color: '#222',
			fontSize: '1.7rem',

			margin: '0.5rem 1.5rem'
		},
		noteBody: {
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
		}
	},

	testWords = /[\w'’]+(?!\w*>)/igm; // capture words and ignore html tags or special chars

function count(text) {
	var wc = 0;

	testWords.lastIndex = 0;
	while (testWords.test(text)) wc++;
	return wc;
}

class NoteEditor extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			threadStyle: Object.assign({}, Style.thread, { backgroundColor: props.thread.color }),
			head: props.note.head,
			body: props.note.body,
			wc: props.note.wc,
			pages: 1,
			pageOf: 1,
			statStyle: {}
		}

		Bind(this);
	}

	render(props, state) {
		return (
			<div
				ref={this.mounted}
				style={Style.box}
			>
				<span style={Style.top}>
					<span style={state.threadStyle}>
						{props.thread.name}
					</span>
					<span style={state.threadStyle}>
						{'+'}
					</span>
				</span>
				<ExpandingTextarea
					style={Style.noteHead}
					maxLength="250"
					oninput={(e) => this.setState({head: e.target.value})}
					change={() => this.context.do('MODIFY_NOTE_HEAD', 
						Object.assign({newHead: this.state.head}, props.coords)
					)}
					value={state.head}
					baseHeight="1.7em"
					placeholder="Title/Summary"
				/>
				<ExpandingTextarea
					ref={this.bodyMounted}
					style={Style.noteBody}
					oninput={this.onBody}
					change={() => this.context.do('MODIFY_NOTE_BODY', 
						Object.assign({newBody: this.state.body, wc: this.state.wc}, props.coords)
					)}
					value={state.body}
					baseHeight="1.1em"
					placeholder="Body"
				/>
				<span style={Object.assign({}, Style.stats, state.statStyle)}>
					<span>
						{state.pageOf + '/' + state.pages}
					</span>
					<span style={Style.wc}>
						{state.wc + ' words'}
					</span>
				</span>
			</div>
		)
	}

	componentDidMount() {
		// get reference to toolbar so we can measure it
		this.toolbar = document.getElementById('toolbar');

		this.onScroll();

		window.addEventListener('scroll', this.onScroll);
		window.addEventListener('resize', this.onResize);

		this.context.setMenu(false, [
			[
				{ 
					icon: './dist/img/undo.svg',
					onClick: (event) => document.execCommand('undo')
				},
				{ 
					icon: './dist/img/redo.svg',
					onClick: (event) => document.execCommand('redo')
				}

			],[
				{ 
					value: 'done',
					onClick: () => this.props.onDone()
				}
			]
		]);

	}

	componentDidUnmount() {
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
		if (this.el.clientHeight > (window.innerHeight - this.toolbar.clientHeight)) {
			this.setState({ statStyle: Style.statSticky })
		} else {
			this.setState({ statStyle: Style.statFree })
		}
	}
}

module.exports = NoteEditor;