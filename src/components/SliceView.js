const
	React = require('preact'),

	SceneEditor = require('./SceneEditor.js'),
	HeaderEditor = require('./HeaderEditor.js'),

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
			width: '14rem',
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
			{[
				<div style={Style.space}>
					<HeaderEditor
						id={props.id}
						onEdit={props.editHeader}
						header={props.header}
					/>
				</div>
			].concat(props.slice.scenes.map((scene, i) => {
				if (scene) return (
					<div style={Style.space}>
						<SceneEditor
							sliceIndex={props.id}
							selected={(props.selection && props.selection.sceneIndex === i)}
							sceneIndex={i}
							scene={scene}
							thread={props.threads[i]}
							onSelect={props.onSelect}
							onDeselect={props.onDeselect}
							onEdit={props.editNote}
							onDrag={props.onDrag}
						/>
					</div>
				);
				else return (
					<div
						style={Style.space}
						onDragOver={(e) => e.preventDefault()}
						onDrop={() => props.onDrop({ sliceIndex: props.id, sceneIndex: i })}
					>
						<button
							style={Style.button}
							onclick={() => this.context.do('NEW_NOTE', {
								sliceIndex: props.id,
								sceneIndex: i
							})}
						>+</button>
					</div>
				);
			}))}
		</div>
	)
}
