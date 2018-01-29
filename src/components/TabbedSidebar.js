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
		backgroundColor: '#999',
		padding: '0.25rem 0',
	},
	button: {
		//margin: '0 0.8rem 0 0.8rem',
		border: 'none',
		outline: 'none',
		backgroundColor: 'inherit',
		color: '#fff',
		width: '1.25rem',
		height: '1.25rem',
		cursor: 'pointer'
	},
	row: {
		padding: '0 0.55rem',
		display: 'flex',
		justifyContent: 'space-around',
		alignItems: 'center',
		height: '2rem',
		flexShrink: '0',
		borderBottom: '1px solid #333'
	},
	buttonText: {
		color: "#000",
		fontSize: "0.9rem",
		marginLeft: "0.5rem",
		fontWeight: "bold"
	}
};

class TabbedSidebar extends React.Component {
	constructor(props, context) {
		super(props, context);

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
							color={(props.tab === i) ? "#000" : "#444"}
							hoverColor="#000"
							style={Style.button}
							noOpacity={(props.tab === i)}
							text={props.text[i]}
							onclick={() => props.onTab(i)}
						/>
					))}
				</div>
				{props.tabs[props.tab]}
			</div>
		);
	}
}

module.exports = TabbedSidebar;