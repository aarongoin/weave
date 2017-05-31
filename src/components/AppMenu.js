const
	React = require('preact'),

	Style = {
		toolbar: {
			zIndex: '20',
			position: 'fixed',
			top: '0',
			left: '0',
			right: '0',

			width: '100%',
			height: '3rem',

			backgroundColor: '#000000',

			color: '#fff'
		},
		menu: {
			width: '100%',
			maxWidth: '50rem',
			height: '3rem',

			marginLeft: 'auto',
			marginRight: 'auto',

			display: 'flex',
			justifyContent: 'space-around'
		},
		ul: {
			display: 'flex',
			justifyContent: 'space-between',

			listStyle: 'none'
		},
		li: {
			display: 'inline',
			flexBasis: '3rem'
		},
		button: {
			height: '3rem',
			padding: '0.75rem',

			border: 'none',
			outline: 'none',
			backgroundColor: '#222',

			display: 'inline',

			color: '#fff',
			fontSize: '1.5rem',

			cursor: 'pointer'
		},
		img: {
			width: '1.5rem',
			height: '1.5rem'
		},
		span: {
			position: 'relative',
			bottom: '0.1rem'
		}
	};


function renderButtons(g) {
	var buttons = [],
		i = -1;
	while (++i < g.length) buttons.push(
		<li>
			<button onclick={g[i].click} name={g[i].name}>
				{g[i].icon ?
					<img src={g[i].icon}/>
				:
					<span style={Style.span}>
						{g[i].text}
					</span>
				}
			</button>
		</li>			
	);
}

function renderGroups(g) {
	var groups = [],
		i = -1;

	while (++i < g.length) groups.push( <ul>renderButtons(g[i])</ul> );
}

module.exports = function(props) {
	return (
		<div 
			id="toolbar"
			style={Style.toolbar}
		>
			<menu 
				type="toolbar"
				style={Style.menu}
			>
				{props.buttons ? renderGroups(props.buttons) : ""}
			</menu>
		</div>
	)
}