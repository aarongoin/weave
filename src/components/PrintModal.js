const
	React = require('preact'),

	ModalView = require('./ModalView.js'),

	Bind = require('../bind.js'),

	Style = {
		scene: {
			display: 'flex',
			justifyContent: 'flex-start',
			fontSize: '0.9rem',
			alignItems: 'center',
			padding: '0.5rem',
			margin: '0.5rem 0.5rem',
		},
		span: {
			width: '9rem',
			marginRight: '1rem',
			whiteSpace: 'nowrap',
			overflow: 'hidden',
			textOverflow: 'ellipsis'
		},
		row: {
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'center',
			width: '100%'
		},
		input: {
			zIndex: '11',
			color: '#000',
			maxWidth: '14rem',
			outline: 'none',
			fontSize: '1rem',
			border: 'none',
			textAlign: 'center',
			padding: '0.25rem',
			marginTop: '0.5rem'
		},
		thread: {
			height: '2rem',
			padding: '0 0.75rem',

			border: 'none',
			outline: 'none',
			backgroundColor: '#000000',

			color: '#fff',
			fontSize: '1rem',

			cursor: 'pointer',
			borderRadius: '1rem'
		},
		sliceSection: {
			minWidth: '20rem'
		},
		threadSection: {
			marginBottom: '1rem'
		},
		date: {
			color: '#fff',
			fontSize: '0.9rem'
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
	};

class PrintModal extends React.Component {
	constructor(props, context) { 
		super(props, context);

		this.state = {
			threads: [],
			filtered: [],
			printList: []
		}

		Bind(this);
	}

	render(props, state) {
		return (
			<ModalView
				dismiss={props.cancel}
			>
				<div
					data-is="threads"
					style={Style.threadSection}
				>
					{props.threads.reduce((threads, t, i) => {
						if (t.name.length) {
							return threads.concat([
								<button
									data-id={i}
									style={Object.assign({}, Style.thread, {
										backgroundColor: (state.threads.indexOf(i) !== -1) ? t.color : '#777'
									})}
									onClick={this.filter}
								>
									{t.name}
								</button>
							]);
						} else return threads;
					}, [])}
				</div>
				<div
					data-is="slices"
					style={Style.sliceSection}
				>
					{props.slices.reduce((slices, slice) => {
						var scenes = slice.scenes.reduce((scenes, scene) => {
							if (scene && state.threads.indexOf(scene.thread) !== -1) {
								return scenes.concat([
									<div
										style={Object.assign({}, Style.scene, {
											color: '#fff',
											backgroundColor: props.threads[scene.thread].color
										})}
									>
										<span
											style={Style.span}
										>{scene.head}</span>
										<span>{scene.wc + ' words'}</span>
									</div>
								]);
							} else return scenes;
						}, []);

						if (scenes.length) {
							scenes.unshift(<span style={Style.date}>{slice.datetime}</span>);
							return slices.concat([
								<div
									style={Style.row}
								>
									{scenes}
								</div>
							]);
						} else return slices;
					}, [])}
				</div>
				<button
					style={Style.item}
					onClick={() => {
						props.cancel();
					}}
				>
					print
				</button>
			</ModalView>
		);
	}

	filter(event) {
		var id = Number(event.target.dataset.id),
			i = this.state.threads.indexOf(id);

		if (i === -1) this.state.threads.push(id);
		else this.state.threads.splice(i, 1);
		
		this.setState({ filtered: [] });

	}
}

module.exports = PrintModal;