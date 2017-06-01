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
		},
		mainButton: {
			minHeight: '2.5rem',
			marginTop: '1px',
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

class AppMenu extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			open: false
		};
	}


	shouldComponentUpdate(props) {
		return (props.groups !== this.props.groups);
	}

	render(props, state) {
		var mainButton = state.open ? props.groups.shift().opened : props.groups.shift().closed;

		return (
			<div 
				id="toolbar"
				style={Object.assign({width: state.open ? '100%' : '7rem'}, Style.toolbar)}
			>	
				{(state.open ? 
					<menu 
						type="toolbar"
						style={Style.menu}
					>
						{props.groups.map((group) =>
							<ul style={Style.ul}>
								{group.map((item) => {
								// BUTTON ITEM
									if (item.onClick) return (
										<li style={Style.li}>
											<button
												style={item.style ? Object.assign({}, Style.item, item.style) : Style.item}
												onClick={(e) => {
													e.target.style.color = "#fff";
													item.onClick(e);
												}}
												onMouseDown={(e) => e.target.style.color = "#777"}
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
												size={item.value.length}
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
				: "")}
				<button
					style={Object.assign({top: state.open ? '2.5rem' : '0rem'}, Style.mainButton)}
					onClick={(e) => {
						if (mainButton.onClick) mainButton.onClick(e)
						this.props.setOffset(state.open ? '0rem' : '2.5rem');
						this.setState({ open: !this.state.open });
					}}
				>
					{mainButton.value}
				</button>
				)}
			</div>
		)
	}
}

module.exports = AppMenu;