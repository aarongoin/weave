const
	Store = require('./Store.js'),

	Bind = require('../bind.js'),

	SliceView = require('./SliceView.js'),

	Style = {
		weave: {
			marginLeft: '7rem',
			display: 'inline-flex',
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'flex-start'
		}
	};
 
class WeaveView extends Store.Component {
	constructor(props) {
		super(props);
	}

	render(props, state) {
		return (
			<div
				key="WeaveView"
				style={Style.weave}
			>
				<HeaderView project={props.project} />
				{props.project.t.map((thread, i) => <ThreadView thread={thread} index={i} /> )}
				<NewThreadView />
			</div>
		)
	}
}

module.exports = WeaveView;