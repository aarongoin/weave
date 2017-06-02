const
	React = require('preact'),

	Style = {
		toolbar: {
			zIndex: '20',
			position: 'fixed',
			top: '0',
			left: '0',
			right: '0',

			height: '2.5rem',
			width: '100%',
			border: 'none',
			borderBottom: 'thin solid #777',

			backgroundColor: '#000000',

			color: '#fff'
		},
		menu: {
			width: '100%',
			height: '2.5rem',

			display: 'flex',
			flexWrap: 'wrap',
			justifyContent: 'space-between'
		},
		ul: {
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',

			listStyle: 'none'
		},
		li: {
			display: 'inline-flex',
			justifyContent: 'center',
			alignItems: 'center',
			margin: '0 0.5rem'
		},
		item: {
			height: '2.5rem',
			padding: '0 0.75rem',

			border: 'none',
			outline: 'none',
			backgroundColor: '#000000',

			color: '#fff',
			fontSize: '1.2rem',

			cursor: 'pointer'
		},
		img: {
			width: '1.2rem',
			height: '1.2rem'
		},
		span: {
			position: 'relative',
			bottom: '0.1rem'
		},
		text: {
			fontSize: '1rem'
		},
		input: {
			height: '2rem',
			padding: '0 0.75rem',
			border: 'none',
			borderBottom: 'thin solid #fff',
			outline: 'none',
			backgroundColor: '#000',
			fontSize: '1.2rem',
			color: '#fff'
		}
	};

function MeasureText(text) {
	var wide = text.match(/[WM]/g),
		thin = text.match(/[Itrlij!. ]/g);

		wide = wide ? wide.length : 0;
		thin = thin ? thin.length : 0;

	return (text.length + wide * 1.2 - thin * 0.3);
}

function AppMenu(props, state) {
	return (
		<div 
			id="toolbar"
			style={Style.toolbar}
		>	
			<menu 
				type="toolbar"
				style={Style.menu}
			>
				{props.groups.map((group) =>
					<ul style={Style.ul}>
						{group.map((item) => {
						// BUTTON ITEM
							if (item.onClick || item.onHold) return (
								<li style={Style.li}>
									<button
										style={item.style ? Object.assign({}, Style.item, item.style) : Style.item}
										onClick={(e) => {
											e.target.style.color = item.style ? item.style.color || "#fff" : '#fff';
											if (item.onClick) item.onClick(e);
											if (item.timer) {
												clearTimeout(item.timer);
												item.timer = undefined;
											}
										}}
										onMouseDown={(e) => {
											e.target.style.color = "#777";
											if (item.onHold) item.timer = setTimeout(item.onHold, 500, e);
										}}
										name={item.name}>
										{item.icon ?
											<img
												style={Style.img}
												src={item.icon}
											/>
										:
											item.value
										}
									</button>
								</li>
							);
						// TEXT INPUT ITEM
							if (item.onInput) return (
								<li style={Style.li}>
									<input
										style={item.style ? Object.assign({}, Style.input, item.style) : Style.input}
										type="text"
										size={MeasureText(item.value)}
										onInput={item.onInput}
										value={item.value}
									/>
								</li>

							);
						// TEXT ITEM
							return (
								<li style={Object.assign({}, Style.li, Style.text, item.style ? item.style : {})}>
									<span>{item.value}</span>
								</li>
							);
						})}
					</ul>
				)}
			</menu>
		</div>
	)
};

AppMenu.main = (o, c) => ({
	opened: o,
	closed: c
});

AppMenu.input = (v, f) => ({ value: v, onInput: f });

AppMenu.text = (v) => ({ value: v });

AppMenu.btn = (v, f) => ({ value: v, onClick: f });

AppMenu.deleteBtn = (f) => ({
	value: 'delete',
	style: {color: '#f00', transition: 'color 1s'},
	onHold: (e) => {e.target.style.color='#777'; setTimeout(f, 1000);}
});

module.exports = AppMenu;