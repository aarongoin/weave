const
	React = require('preact'),

	ModalView = require('./ModalView.js'),

	Style = {
		scene: {
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
			padding: '0.25rem',
			marginTop: '0.5rem'
		},
		title: {
			height: '2rem',
			maxWidth: '95vw',
			padding: '0 0.75rem',
			border: 'none',
			borderBottom: 'thin solid #fff',
			outline: 'none',
			backgroundColor: '#000',
			fontSize: '1.2rem',
			color: '#fff'
		},
		author: {
			height: '2rem',
			maxWidth: '95vw',
			padding: '0 0.75rem',
			border: 'none',
			borderBottom: 'thin solid #fff',
			outline: 'none',
			backgroundColor: '#000',
			fontSize: '1rem',
			color: '#fff'
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
		row: {
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
			marginTop: '1rem'
		}

	};

function MeasureText(text) {
	var wide = text.match(/[WM]/g),
		thin = text.match(/[Itrlij!. ]/g);

		wide = wide ? wide.length : 0;
		thin = thin ? thin.length : 0;

	return (text.length + wide * 1.2 - thin * 0.3);
}

class ProjectModal extends React.Component {
	constructor(props, context) { 
		super(props, context);
	}

	render(props, state) {
		return (
			<ModalView
				dismiss={props.onDone}
			>
				<div style={Style.row}>
					<input
						style={Style.title}
						type="text"
						placeholder="Project Title"
						maxLength={40}
						size={Math.max(MeasureText(props.title.length ? props.title : (props.placeholder || '')), 20)}
						onInput={props.functions.onTitleChange}
						value={props.title}
					/>
				</div>
				<div style={Style.row}>
					<input
						style={Style.author}
						type="text"
						placeholder="Author"
						maxLength={40}
						size={Math.max(MeasureText(props.author.length ? props.author : (props.placeholder || '')), 20)}
						onInput={props.functions.onAuthorChange}
						value={props.author}
					/>
				</div>

				<div style={Style.row}>
					<button
						style={Style.item}
						onClick={() => {
							props.onDone();
							props.functions.import()
						}}
					>
						import
					</button>
					<button
						style={Style.item}
						onClick={() => {
							props.onDone();
							props.functions.export()
						}}
					>
						export
					</button>
					<button
						style={Style.item}
						onClick={() => {
							props.onDone();
							props.functions.print()
						}}
					>
						print
					</button>
				</div>
				<div style={Style.row}>
					<button
						style={Object.assign({}, Style.item, { color: '#f00', transition: 'color 1s' })}
						onClick={(e) => {
							e.target.style.color = '#f00';
							if (this.timer) {
								clearTimeout(this.timer);
								this.timer = undefined;
							}
						}}
						onMouseDown={(e) => {
							e.target.style.color = "#777";
							this.timer = setTimeout(props.functions.delete, 1000, e);
						}}
					>delete</button>
				</div>

			</ModalView>
		);
	}
}

module.exports = ProjectModal;