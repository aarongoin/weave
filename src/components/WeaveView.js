const
	React = require('preact'),

	Bind = require('../bind.js'),

	SliceView = require('./SliceView.js'),
	WeaveHeaders = require('./WeaveHeaders.js'),
	WeaveBackground = require('./WeaveBackground.js'),
	NewSliceButton = require('./NewSliceButton.js'),

	Style = {
		weave: {
			marginLeft: '8rem',
			display: 'inline-flex',
		},
		scenes: {
			zIndex: 5,
			position: 'relative',
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'flex-start'
		}
	};
 
class WeaveView extends React.Component {
	constructor(props, context) {
		super(props, context);

		Bind(this);
	}

	render(props, state) {
		return (
			<div
				data-is="WeaveView"
				style={Style.weave}
				onclick={props.onDeselect}
			>
				<WeaveBackground
					slices={props.project.s.length}
					threads={props.project.t}
				/>
				<div data-is="Weave" style={Style.scenes}>
					{[
						<NewSliceButton
							halfWidth={true}
							onClick={() => this.context.do('NewSlice', {atIndex: 0})}
						/>
					].concat(props.project.s.map((slice, i) => [
						<SliceView
							id={i}
							selection={(props.focusedScene && props.focusedScene.sliceIndex === i) ? props.focusedScene : null}
							slice={slice}
							threads={props.project.t}
							onSelect={props.onSelect}
							onDeselect={props.onDeselect}
							onEditScene={props.onEditScene}
							onSceneDrag={this.onSceneDrag}
							onSceneDrop={this.onSceneDrop}
							onHeaderDrop={this.onHeaderDrop}
						/>,
						<NewSliceButton
							halfWidth={false}
							onClick={() => this.context.do('NewSlice', {atIndex: i+1})}
						/>
					]))}
				</div>
				<WeaveHeaders
					slices={props.project.s}
					threads={props.project.t}
					windowWidth={props.windowWidth}
				/>
			</div>
		)
	}

	onHeaderDrop(from, to) {
		this.context.do('MoveSliceHeader', {
			from: from,
			to: to
		});
	}

	onSceneDrag(coords) {
		this.setState({selection: null});
	}

	onSceneDrop(from, to) {
		this.context.do('MoveScene', {
			from: from,
			to: to
		});
	}

}

module.exports = WeaveView;