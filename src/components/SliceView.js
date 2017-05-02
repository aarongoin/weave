const
	React = require('preact'),

	NoteView = require('./NoteView.js'),

	Store = require('../store.js'),

	Style = {
		crossThread: {
			zIndex: '-11',
			width: '2px',
			position: 'absolute',
			marginLeft: '6.95rem',
			backgroundColor: 'rgba(255, 255, 255, 0.1)'
		},

		slice: {
			display: 'block',
			width: '14rem'
		},

		sliceHeader: {
			zIndex: '10',
			height: '1.5rem',
			position: 'fixed',
			top: '3rem',
			color: '#fff',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			width: '14rem',
			fontSize: '0.9rem'
		},

		space: {
			height: '14rem',
			maxHeight: '14rem',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'flex-end'
		},

		button: {
			fontSize: '0.9rem',
			color: '#fff',
			border: 'none',
			outline: 'none',
			cursor: 'pointer',
			width: '1.3rem',
			height: '1.2rem',
			backgroundColor: 'rgba(0,0,0,0)',
			textAlign: 'center',
			margin: '0 1rem 0.4rem 1rem',
			borderRadius: '1rem'
		},

		noNote: {
			height: '100%',
			width: '100%'
		}
	};


class SliceView extends React.Component {

	render(props, state) {
		var spaces = [],
			i = -1;
		while (++i < props.notes.length) {
			spaces.push(
				<div style={Style.space}>
					{(props.notes[i]) ?
						<NoteView
							note={props.notes[i]}
							thread={props.threads[i]}
							editFunc={props.editFunc}
						/>
					:
						<button
							style={Style.button}
							thread={props.threads[i]}
							data-thread={i}
							onclick={this.newNote}
						>+</button>
					}
				</div>
			);	
		}

		return (
			<div style={Style.slice}>
				<div style={Object.assign(Style.sliceHeader, { top: props.scrollY })}>
					{props.header}
				</div>
				<div style={Object.assign(Style.crossThread, { height: ((props.threads.length + 1)*14) + 'rem' })}>
					&nbsp;
				</div>
				{spaces}
			</div>
		)
	}

	newNote(event) {
		this.createNote(this.props.id, Number(event.target.dataset.thread));
	}
}

module.exports = SliceView;