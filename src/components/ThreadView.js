const
	Store = require('./Store.js'),

	Style = {
		thread: {

		},
		space: {
			height: '14rem',
			width: '14rem',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'flex-end'
		}
	};

class ThreadView extends Store.Component {
	constructor(props) {
		super(props, 'bindAll');

		this.listen([
			'MoveThread',
			'MoveScene',
			'NewScene',
			'DeleteScene'
		]);
	}

	renderDom(props, state) {
		return (
			<div style={Style.thread}>
				<ThreadHeader index={props.index} />
				<NewSceneButton thread={props.index} scene={0} newSlice />
				{props.thread.scenes.reduce((list, scene, i) => list.concat(scene ? [
					<div style={Style.space}>
						<SceneEditor scene={scene} thread={props.thread} index={0} />
					</div>,
					<NewSceneButton thread={props.index} scene={i+1} newSlice />
				] : [
					<DropZone
						style={Style.space}
						type="scene"
						effect="move"
						onDrop={(payload) => this.actions.moveScene(payload, [props.index, i])}
					>
						<NewSceneButton thread={props.index} scene={i}>
					</DropZone>,
					<NewSceneButton coords={[props.index, i+1]} newSlice />
				]), [])}
			</div>
		);
	}
}

module.exports = ThreadView;