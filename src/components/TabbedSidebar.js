const
React = require('preact'),

Bind = require('../bind.js'),
Button = require('../buttons.js'),

Style = {
	item: {
		color: "#fff",
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'stretch',
		alignItems: 'stretch',
		//borderRadius: '0.25rem',
		borderTop: '1px solid #555',
		backgroundColor: '#444',
		padding: '0.15rem 0',
	},
	button: {
		margin: '0 0.8rem 0 0.8rem',
		border: 'none',
		outline: 'none',
		backgroundColor: 'inherit',
		color: '#fff',
		width: '1rem',
		height: '1rem',
		cursor: 'pointer'
	},
	row: {
		marginBottom: '0.25rem',
		padding: '0 0.55rem',
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		height: '1.75rem',
		flexShrink: '0',
		borderBottom: '1px solid #333'
	}
};

class TabbedSidebar extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			view: props.default
		}

		Bind(this);
	}
	render(props, state, context) {
		return (
			<div
				style={Object.assign({}, Style.item, props.style || {})}
			>
				<div style={Style.row}>
					{props.buttons.map((icon, i) => (
						<Button
							img={icon}
							color="#fff"
							style={Style.button}
							onclick={() => this.setState({view: i})}
						/>
					))}
				</div>
				{props.tabs[state.view]}
			</div>
		);
	}
}

module.exports = TabbedSidebar;