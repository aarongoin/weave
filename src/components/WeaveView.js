const
	React = require('preact'),

	Bind = require('../bind.js'),

	SliceView = require('./SliceView.js'),
	WeaveHeaders = require('./WeaveHeaders.js'),
	WeaveBackground = require('./WeaveBackground.js'),
	ProjectModal = require('./ProjectModal.js'),
	NewSliceButton = require('./NewSliceButton.js'),

	Style = {
		weave: {
			marginLeft: '7rem',
			display: 'inline-flex'
		},
		scenes: {
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'flex-start'
		},
		titleSpace: {
			zIndex: 22,
			position: 'absolute',
			left: 0,
			top: 0,
			height: '8rem',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center'
		},
		projectButton: {
			
			minHeight: '2.5rem',
			padding: '0.5rem 0.75rem',
			width: '7rem',
			
			outline: 'none',
			backgroundColor: '#fff',

			border: 'none',

			color: '#000',
			fontSize: '1.2rem',

			cursor: 'pointer'
		}
	};
 
class WeaveView extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			selection: null,
			projectModal: false
		}

		this.allowDeselect = true;

		Bind(this);
	}

	render(props, state) {
		return (
			<div
				data-is="WeaveView"
				style={Style.weave}
				onclick={this.onDeselect}
			>
				<WeaveHeaders
					slices={props.project.slices}
					threads={props.project.threads}
					windowWidth={props.windowWidth}
				/>
				<WeaveBackground
					slices={props.project.slices.length}
					threads={props.project.threads}
				/>
				<div data-is="Weave" style={Style.scenes}>
					{[
						<NewSliceButton
							halfWidth={true}
							onClick={() => this.context.do('NEW_SLICE', {atIndex: 0})}
						/>
					].concat(props.project.slices.map((slice, i) => [
						<SliceView
							id={i}
							selection={(state.selection && state.selection.sliceIndex === i) ? state.selection : null}
							slice={slice}
							threads={props.project.threads}
							onSelect={this.onSelect}
							onDeselect={this.onDeselect}
							editNote={props.editNote}
							onSceneDrag={this.onSceneDrag}
							onSceneDrop={this.onSceneDrop}
							onHeaderDrop={this.onHeaderDrop}
						/>,
							<NewSliceButton
								halfWidth={false}
								onClick={() => this.context.do('NEW_SLICE', {atIndex: i+1})}
							/>
						]
					))}
				</div>
				{(!state.projectModal ?
					<div style={Style.titleSpace}>
						<button
							style={Style.projectButton}
							onClick={() => this.setState({ projectModal: true })}
						>
							{props.project.title.length ? props.project.title : 'Project Title'}
						</button>
					</div>
				:
					<ProjectModal
						title={props.project.title}
						author={props.project.author}
						functions={props.projectFuncs}
						onDone={() => this.setState({ projectModal: false })}
					/>
				)}
			</div>
		)
	}

	onSelect(coords, i) {
		this.setState({selection: coords});
	}

	onDeselect(event) {
		this.sceneDeselected();
	}

	sceneDeselected() {
		if (this.allowDeselect) {
			this.setState({selection: null});
		}
	}

	onHeaderDrop(from, to) {
		this.context.do('MOVE_SLICE_HEADER', {
			from: from,
			to: to
		});
	}

	onSceneDrag(coords) {
		this.dragScene = coords;
		this.setState({selection: null});
	}

	onSceneDrop(from, to) {
		if (this.dragScene) this.context.do('MOVE_NOTE', {
			from: from,
			to: to
		});
	}

}

module.exports = WeaveView;