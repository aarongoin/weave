const
	React = require('preact'),

	Bind = require('../bind.js'),

	SliceView = require('./SliceView.js'),
	WeaveHeaders = require('./WeaveHeaders.js'),
	WeaveBackground = require('./WeaveBackground.js'),

	Style = {
		weave: {
			marginLeft: '7rem',
			display: 'inline-flex'
		},
		slices: {
			marginTop: '2rem',
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'flex-start'
		}
	};
 
class WeaveView extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.selection = [];
		this.allowDeselect = true;

		Bind(this);
	}

	shouldComponentUpdate(props, state, context) {
		return ((props.menuOffset !== this.props.menuOffset) ||
				(props.locations !== this.props.locations) ||
				(props.slices !== this.props.slices) ||
				(props.threads !== this.props.threads));
	}

	render(props, state) {
		return (
			<div data-is="WeaveView" style={Object.assign({marginTop: props.menuOffset}, Style.weave)}>
				<WeaveHeaders
					slices={props.slices}
					locations={props.locations}
				/>
				<WeaveBackground
					slices={props.slices.length}
					locations={props.locations.length}
					menuOffset={props.menuOffset}
				/>
				<div data-is="Weave" style={Style.slices}>
					{props.slices.map((slice, i) =>
						<SliceView
							id={i}
							slice={slice}
							threads={props.threads}
							onSelect={this.onSelect}
							onDeselect={this.onDeselect}
						/>
					)}
				</div>
			</div>
		)
	}

	activeNoteMenu() {
		this.context.setMenu(false, [
			[{
				value: 'delete',
				style: {color: '#f00'},
				onClick: () => {
					this.context.do('DELETE_NOTE', this.selection[0])
					noteDeselected();
				}
			}],[{
				value: 'move',
				onClick: () => {
					this.allowDeselect = false;
					console.log("TODO!")
				}
			}],[{
				value: 'edit',
				onClick: () => {
					this.allowDeselect = false;
					this.props.editNote(this.selection[0])
				}
			}]
		]);
	}

	onSelect(coords, i) {
		if (this.props.canSelectMany) {
			i = this.selection.findIndex((c) => (c.sliceIndex === coords.sliceIndex && c.noteIndex === coords.noteIndex));
			if (i < 0) this.selection.push(coords);
			else this.selection.push(this.selection.splice(i, 1));
		} else {
			this.selection[0] = coords;
			this.activeNoteMenu();
		}
	}

	onDeselect(coords, i) {
		if (this.canSelectMany) {
			i = i || this.selection.findIndex((c) => (c.sliceIndex === coords.sliceIndex && c.noteIndex === coords.noteIndex));
			this.selection.splice(i, 1);
			if (!this.selection.length) {
				this.selected = 0;
				this.forceUpdate();
			}
		} else {
			setTimeout(this.noteDeselected, 100);			
		}
	}

	noteDeselected() {
		if (this.allowDeselect) {
			this.selection.pop();
			this.context.setMenu(true, []);
		}
	}
}

module.exports = WeaveView;