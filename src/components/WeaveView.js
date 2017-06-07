const
	React = require('preact'),

	Bind = require('../bind.js'),

	SliceView = require('./SliceView.js'),
	WeaveHeaders = require('./WeaveHeaders.js'),
	WeaveBackground = require('./WeaveBackground.js'),
	AppMenu = require('./AppMenu.js'),

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
		}
	};
 
class WeaveView extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			selection: null
		}

		this.allowDeselect = true;

		Bind(this);
	}

	render(props, state) {
		return (
			<div
				data-is="WeaveView"
				style={Object.assign({marginTop: props.menuOffset}, Style.weave)}
				onclick={this.onDeselect}
			>
				<WeaveHeaders
					scenes={props.scenes}
					locations={props.locations}
					windowWidth={props.windowWidth}
				/>
				<WeaveBackground
					scenes={props.scenes.length}
					locations={props.locations.length}
					menuOffset={props.menuOffset}
				/>
				<div data-is="Weave" style={Style.scenes}>
					{props.scenes.map((slice, i) =>
						<SliceView
							id={i}
							selection={(state.selection && state.selection.sliceIndex === i) ? state.selection : null}
							slice={slice}
							threads={props.threads}
							onSelect={this.onSelect}
							onDeselect={this.onDeselect}
							editNote={props.editNote}
							moveNote={this.moveNote}
						/>
					)}
				</div>
			</div>
		)
	}

	onSelect(coords, i) {
		this.setState({selection: coords});
		//this.activeNoteMenu();
	}

	onDeselect(event) {
		this.noteDeselected();
	}

	noteDeselected() {
		if (this.allowDeselect) {
			this.setState({selection: null});
		}
	}
}

module.exports = WeaveView;