const
	React = require('preact'),

	Bind = require('../bind.js'),
	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Style = {
		box: {
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
			backgroundColor: 'rgba(0,0,0,0)',
			border: 'none',
			outline: 'none',
			cursor: 'pointer'
		}
	};


class NoteView extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			focused: false
		}

		Bind(this);
	}

	componentDidMount() {
		this.base.style.border = (this.state.focused) ? ('0.2rem solid ' + props.thread.color) : '0 solid rgba(0,0,0,0)';
		this.base.style.margin = (this.state.focused) ? '0' : '0.2rem';
	}

	render(props, state) {
		var argyle = Object.assign({}, Style.box, {
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
					style={Object.assign({}, Style.stats, {backgroundColor: props.thread.color})}
				>
					<button 
						onclick={() => props.onEdit({sliceIndex: props.sliceIndex, noteIndex: props.noteIndex})} 
						style={Style.button}
					>edit</button>
					<span style={Style.wordcount}>{props.note.wc} words</span>
				</span>
			</div>
		)
	}

	onInput(event) {
		//
	}

	onCreateNote(event) {
		this.newNote(event);
	}

	onFocus() {
		if (!this.state.focused) this.select();
	}

	onChange(event) {
		if (this.state.focused) this.deselect();
		this.context.do('MODIFY_NOTE_HEAD', {
			sliceIndex: this.props.sliceIndex,
			noteIndex: this.props.noteIndex,
			newHead: event.target.value
		});
	}

	onBlur() {
		if (this.state.focused) this.deselect();
	}

	onClick(event) {
		this.el.base.focus();
	}

	select() {
		this.setState({ focused: true });
		this.props.onSelect({
			sliceIndex: this.props.sliceIndex,
			noteIndex: this.props.noteIndex
		});
	}

	deselect() {
		this.setState({ focused: false });
		this.props.onDeselect({
			sliceIndex: this.props.sliceIndex,
			noteIndex: this.props.noteIndex
		});
	}
}

module.exports = NoteView;