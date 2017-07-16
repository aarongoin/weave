const
	React = require('preact'),

	SceneEditor = require('./SceneEditor.js'),
	HeaderEditor = require('./HeaderEditor.js'),
	NewSliceButton = require('./NewSliceButton.js'),

	Draggable = require('./Draggable.js'),
	DropZone = require('./DropZone.js'),

	Style = {
		slice: {
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'flex-start',
			alignItems: 'flex-start',
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
			padding: '0.2rem 0.6rem',
			fontSize: '1.2rem',
			color: '#fff',
			border: 'none',
			outline: 'none',
			cursor: 'pointer',
			backgroundColor: 'rgba(0,0,0,0)',
			textAlign: 'center',
			margin: '0 3rem',
			marginBottom: '0.1rem',
			borderRadius: '1rem'
		}
	};


class SliceView extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			width: 0,
		};
	}

	render(props, state) {
		return (
			<div
				style={Style.slice}
				ref={el => this.el = el}
			>
					{[
						( props.slice.h.length ?
							<Draggable
								style={Object.assign({}, Style.space, {height: '5.25rem'})}
								type="header"
								effect="move"
								payload={props.id}
							>
								<HeaderEditor
									id={props.id}
									value={props.slice.h}
								/>
							</Draggable>
						:
							<DropZone
								style={Object.assign({}, Style.space, {height: '5.25rem'})}
								type="header"
								effect="move"
								onDrop={(payload) => props.onHeaderDrop(payload, props.id)}
							>
								<HeaderEditor
									id={props.id}
									value={props.slice.h}
								/>
							</DropZone>
						)
					].concat(props.slice.s.map((scene, i) => {
						if (scene) return (
							<Draggable
								style={Style.space}
								type="scene"
								effect="move"
								payload={{sliceIndex: props.id, sceneIndex: i}}
							>
								<SceneEditor
									sliceIndex={props.id}
									selected={(props.selection && props.selection.sceneIndex === i)}
									sceneIndex={i}
									key={scene.i}
									scene={scene}
									thread={props.threads[i]}
									
									onSelect={props.onSelect}
									onDeselect={props.onDeselect}
									onEditScene={props.onEditScene}
								/>
							</Draggable>
						);
						else return (
							<DropZone
								style={Style.space}
								type="scene"
								effect="move"
								onDrop={(payload) => props.onSceneDrop(payload, { sliceIndex: props.id, sceneIndex: i })}
							>
								<button
									style={Style.button}
									onmouseenter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
									onmouseleave={e => e.target.style.backgroundColor = 'rgba(0,0,0,0)'}
									onclick={() => this.context.do('NewScene', {
										sliceIndex: props.id,
										sceneIndex: i
									})}
								>+</button>
							</DropZone>
						);
					}))}
			</div>
		)
	}
}

module.exports = SliceView;
