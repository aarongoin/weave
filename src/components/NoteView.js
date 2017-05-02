const
	React = require('preact'),

	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Style = {
		box: {
			zIndex: '0',
			maxWidth: '50rem',
			backgroundColor: '#fff',
			color: '#222',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-around',
			alignItems: 'stretch',
			width: '14rem',
			position: 'relative',
			top: '0.2rem',
			maxHeight: '13rem'
		},

		noteHead: {
			fontSize: '1.1rem',
			height: '1.3rem',
			margin: '0.25rem 0.75rem'
		},

		stats: {
			color: '#fff',
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
			padding: '0.5rem 0.75rem 0.5rem 0.75rem',
			fontSize: '0.9rem'
		},

		wordcount: {
			fontSize: '0.9rem'
		},

		textarea: {
			fontSize: '1.1rem',
			margin: '0.75rem'
		},

		button: {
			fontSize: '0.9rem',
			color: '#fff',
			border: 'none',
			outline: 'none',
			cursor: 'pointer'
		}
	};


class NoteView extends React.Component {
	constructor(props, context) {
		super(props);

		this.state = {
			focused: false
		}

		this.onInput = this.onInput.bind(this);
		this.onEdit = this.onEdit.bind(this);
		this.onCreateNote = this.onCreateNote.bind(this);
		this.onFocus = this.onFocus.bind(this);
		this.onChange = this.onChange.bind(this);
		this.onBlur = this.onBlur.bind(this);
		this.onClick = this.onClick.bind(this);
	}

	componentDidMount() {
		this.base.style.border = (this.state.focused) ? ('0.2rem solid ' + props.thread.color) : '0 solid rgba(0,0,0,0)';
		this.base.style.margin = (this.state.focused) ? '0' : '0.2rem';
	}

	render(props, state) {
		var argyle = Object.assign(Style.box, {
			border: ((state.focused) ? ('0.2rem solid ' + props.thread.color) : '0 solid rgba(0,0,0,0)'),
			margin: (state.focused) ? '0' : '0.2rem'
		});

		return (
			<div
				style={argyle}
				onclick={this.onClick}
			>
				<ExpandingTextarea
					style={Style.textarea}
					maxLength={250} 
					oninput={this.onInput} 
					baseHeight="1.3rem"
					placeholder="Title/Summary"
					value={props.note.head}
					focus={this.onFocus}
					change={this.onChange}
					blur={this.onBlur}
					ref={el => this.el = el}
				/>
				<span 
					style={Object.assign(Style.stats, {backgroundColor: props.thread.color})}
				>
					<button 
						onclick={this.onEdit} 
						style={Object.assign(Style.button, {backgroundColor: props.thread.color})}
					>edit</button>
					<span style={Style.wordcount}>{props.note.wc} words</span>
				</span>
			</div>
		)
	}

	onInput(event) {
		//
	}

	onEdit() {
		this.editFunc(this.note);
	}

	onCreateNote(event) {
		this.newNote(event);
	}

	onFocus() {
		if (!this.state.focused) this.setState({ focused: true });
	}

	onChange() {
		if (this.state.focused) this.setState({ focused: false });
	}

	onBlur() {
		if (this.state.focused) this.setState({ focused: false });
	}

	onClick(event) {
		this.el.base.focus();
	}
}

module.exports = NoteView;