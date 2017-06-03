const
	React = require('preact'),

	NoteView = require('./NoteView.js'),

	Style = {
		slice: {
			zIndex: 9,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'flex-start',
			alignItems: 'center',
			margin: '0 2rem',
			width: '14rem'
		},

		space: {
			height: '14rem',
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
		}
	};

module.exports = function(props, state) {
	
	return (
		<div style={Style.slice}>
			{props.slice.notes.map((note, i) => 
				<div style={Style.space}>
					{(note) ?
						<NoteView
							sliceIndex={props.id}
							selected={(props.selection && props.selection.noteIndex === i)}
							noteIndex={i}
							note={note}
							thread={props.threads[note.thread]}
							onSelect={props.onSelect}
							onDeselect={props.onDeselect}
							onEdit={props.editNote}
						/>
					:
						<button
							style={Style.button}
							onclick={() => this.context.do('NEW_NOTE', {
								sliceIndex: props.id,
								noteIndex: i
							})}
						>+</button>
					}
				</div>
			)}
		</div>
	)
}
