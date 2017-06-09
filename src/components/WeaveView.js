const
	React = require('preact'),

	Bind = require('../bind.js'),

	SliceView = require('./SliceView.js'),
	WeaveHeaders = require('./WeaveHeaders.js'),
	WeaveBackground = require('./WeaveBackground.js'),
	ProjectModal = require('./ProjectModal.js'),

	Style = {
		weave: {
			marginLeft: '7rem',
			display: 'inline-flex'
		},
		scenes: {
			marginTop: '2rem',
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'flex-start'
		},
		projectButton: {
			zIndex: 22,
			minHeight: '2.5rem',
			padding: '0.5rem 0.75rem',
			width: '7rem',
			position: 'fixed',
			left: 0,

			outline: 'none',
			backgroundColor: '#000000',

			border: 'none',
			borderBottom: 'thin solid #777',

			color: '#fff',
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
					slices={props.slices}
					locations={props.locations}
					windowWidth={props.windowWidth}
				/>
				<WeaveBackground
					slices={props.slices.length}
					locations={props.locations.length}
				/>
				<div data-is="Weave" style={Style.scenes}>
					{props.slices.map((slice, i) =>
						<SliceView
							id={i}
							selection={(state.selection && state.selection.sliceIndex === i) ? state.selection : null}
							slice={slice}
							threads={props.threads}
							onSelect={this.onSelect}
							onDeselect={this.onDeselect}
							editNote={props.editNote}
							onDrag={this.onNoteDrag}
							onDrop={this.onNoteDrop}
						/>
					)}
				</div>
				{(!state.projectModal ?
					<button
						style={Style.projectButton}
						onClick={() => this.setState({ projectModal: true })}
					>
						{props.title}
					</button>
				:
					<ProjectModal
						title={props.title}
						author={props.author}
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

	onNoteDrag(coords) {
		this.dragging = coords;
	}

	onNoteDrop(coords) {
		if (this.dragging) this.context.do('MOVE_NOTE', {
			from: this.dragging,
			to: coords
		});
	}

}

module.exports = WeaveView;