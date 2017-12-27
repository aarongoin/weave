const
React = require('preact'),

Bind = require('../bind.js'),

Style = {
	item: {
		color: "#fff",
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'stretch',
		//borderRadius: '0.25rem',
		borderTop: '1px solid #555',
		backgroundColor: '#444',
		padding: '0.15rem 0',
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

function SidebarItem(props, state, context) {
	return (
		<div
			style={Object.assign({}, Style.item, props.style || {})}
		>
			<div style={Style.row}>
				{props.buttons}
			</div>
			{props.children}
		</div>
	);
}

module.exports = SidebarItem;