const
	React = require('preact'),

	FileSaver = require('file-saver'),
	FileOpener = require('./FileOpener.js'),

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
			width: '15rem',
			padding: '0 0.75rem',
			border: 'none',
			borderBottom: 'thin solid #fff',
			outline: 'none',
			backgroundColor: '#ddd',
			fontSize: '1.2rem',
			color: '#000'
		},
		author: {
			height: '2rem',
			width: '15rem',
			padding: '0 0.75rem',
			border: 'none',
			borderBottom: 'thin solid #fff',
			outline: 'none',
			backgroundColor: '#ddd',
			fontSize: '1rem',
			color: '#000'
		},
		item: {
			height: '2.5rem',
			padding: '0 0.75rem',

			border: 'none',
			outline: 'none',
			backgroundColor: '#fff',

			color: '#000',
			fontSize: '1.2rem',

			cursor: 'pointer'
		},
		row: {
			width: '100%',
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
			marginTop: '1.5rem',
			color: '#000'
		},
		rowLeft: {
			width: '100%',
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'center',
			marginTop: '1rem',
			color: '#fff'
		},
		label: {
			color: '#000',
			marginRight: '1rem',
			width: '3.5rem',
			textAlign: 'right'
		},
		issues: {
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			marginTop: '1.5rem',
			fontSize: '0.8rem',
			color: '#000'
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

	render(props, state, context) {
		return (
			<ModalView
				dismiss={props.onDone}
			>
				<FileOpener
					ref={(el) => (this.FileOpener = el ? el.base : undefined)}
					onChange={(data) => context.Do('ImportProject', {project: JSON.parse(data)})}
				/>
				<div style={Style.rowLeft}>
					<label style={Style.label}>Title</label>
					<input
						style={Style.title}
						type="text"
						placeholder="Project Title"
						maxLength="40"
						size="23"
						onInput={(e) => context.Do('ModifyProjectTitle', {title: e.target.value})}
						value={props.project.p}
					/>
					
				</div>
				<div style={Style.rowLeft}>
					<label style={Style.label}>Author</label>
					<input
						style={Style.author}
						type="text"
						placeholder="Author"
						maxLength="40"
						size="29"
						onInput={(e) => context.Do('ModifyProjectAuthor', {author: e.target.value})}
						value={props.project.a}
					/>
				</div>
				<div style={Style.row}>
					<span>{props.project.w + ' words'}</span>
					<span>{props.project.c + ' scenes'}</span>
				</div>
				<div style={Style.row}>
					<button
						style={Style.item}
						onClick={() => {
							this.importProject();
							props.onDone();
						}}
					>
						import
					</button>
					<button
						style={Style.item}
						onClick={() => {
							this.exportProject();
							props.onDone();
						}}
					>
						export
					</button>
					<button
						style={Style.item}
						onClick={() => {
							props.onPrint();
						}}
					>
						print
					</button>
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
							this.timer = setTimeout(context.Do, 1000, 'NewProject');
						}}
					>delete</button>
				</div>
				<section style={Style.issues}>
					<p>
						Notice any bugs? Think something can be improved?
					</p>
					<a
						style={Object.assign({}, Style.item, {fontSize: '0.8rem', fontWeight: '600', marginTop: '0.25rem'})}
						href="https://github.com/aarongoin/weave/issues"
						target="_blank"
					>Report issues here.</a>
				</section>
			</ModalView>
		);
	}

	importProject() {
		this.FileOpener.click();
	}

	exportProject() {
		FileSaver.saveAs(new Blob([JSON.stringify(this.props.project)], {type: "text/plain;charset=utf-8"}), this.props.project.p + '.weave');
	}
}

module.exports = ProjectModal;