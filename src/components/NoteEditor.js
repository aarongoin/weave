const
	React = require('preact'),

	DateTime = require('./DateTime.js'),
	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Store = require('../store.js'),

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
			color: '#222'
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
		super(props);

		this.thread = Store.getThread(props.note.thread);

		this.state = {
			threadStyle: Object.assign(Style.thread, { backgroundColor: this.thread.color }),
			wc: props.note.wc || 0,
			pages: 1,
			pageOf: 1,
			statStyle: {}
		}

	}

	render(props, state) {
		return (
			<div
				re={this.mounted}
				class="box"
			>
				<span class="top">
					<span style={Object.assign(Style.thread, { backgroundColor: this.thread.color })}>
						props.thread.name
					</span>
					<span style={Object.assign(Style.thread, { backgroundColor: this.thread.color })}>
						'+'
					</span>
				</span>
				<ExpandingTextarea
					style={Style.noteHead}
					maxLength="250"
					change={this.onHead}
					value={props.note.head}
					baseHeight="1.3em"
					placeholder="Title/Summary"
				/>
				<ExpandingTextarea
					ref={this.bodyMounted}
					style={Style.noteBody}
					input={this.onBody}
					value={props.note.body}
					baseHeight="1.3em"
					placeholder="Body"
				/>
				<span style={Object.assign(Style.stats, state.statStyle)}>
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

		this.menu([
			{ 
				name: 'undo',
				icon: './dist/img/undo.svg',
				click: (event) => document.execCommand('undo')
			},
			{ 
				name: 'redo',
				icon: './dist/img/redo.svg',
				click: (event) => document.execCommand('redo')
			}

		]);

	}

	componentDidUnmount() {
		window.removeEventListener('scroll', this.onScroll);
		window.removeEventListener('resize', this.onResize);
	}

	onHead(event) {
		Store.do({
			type: 'MOD_NOTE_HEAD',
			noteID: this.props.note.id,
			newHead: event.target.value
		});
	}

	onBody(event) {
		Store.do({
			type: 'MOD_NOTE_BODY',
			noteID: this.props.note.id,
			newHead: event.target.value
		});
		this.setState({
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
		this.setState({ pages: t });
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