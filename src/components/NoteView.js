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

		Bind(this);
	}

	render(props, state) {
		var argyle = Object.assign({}, Style.box, {
			border: (props.selected ? ('0.2rem solid ' + props.thread.color) : '0 solid rgba(0,0,0,0)'),
			margin: props.selected ? '0' : '0.2rem'
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

	onCreateNote(event) {
		this.newNote(event);
	}

	onFocus(event) {
		if (!this.props.selected) this.select();
	}

	onChange(event) {
		this.context.do('MODIFY_NOTE_HEAD', {
			sliceIndex: this.props.sliceIndex,
			noteIndex: this.props.noteIndex,
			newHead: event.target.value
		});
	}

	onClick(event) {
		event.stopPropagation();
		if (!this.props.selected) {
			this.select();
			this.el.base.focus();
		}
	}

	select() {
		this.props.onSelect({
			sliceIndex: this.props.sliceIndex,
			noteIndex: this.props.noteIndex
		});
	}
}

module.exports = NoteView;