const
	React = require('preact'),

	FileSaver = require('file-saver'),

	ModalView = require('./ModalView.js'),

	Bind = require('../bind.js'),

	Style = {
		scene: {
			display: 'flex',
			justifyContent: 'space-around',
			fontSize: '0.9rem',
			alignItems: 'center',
			padding: '0.5rem',
			margin: '0.5rem 0.5rem',
			width: '20rem'
		},
		span: {
			minWidth: '5rem',
			marginRight: '1rem',
			whiteSpace: 'nowrap',
			overflow: 'hidden',
			textOverflow: 'ellipsis'
		},
		row: {
			display: 'flex',
			justifyContent: 'space-around',
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

			marginTop: '1rem',

			border: 'none',
			outline: 'none',
			backgroundColor: '#fff',

			color: '#000',
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
			deselected: []
		}

		this.filter();

		Bind(this);
	}

	render(props, state) {
		const select = this.select;

		return (
			<ModalView
				dismiss={props.onDone}
			>
				<div
					data-is="threads"
					style={Style.threadSection}
				>
					{props.project.t.reduce((threads, t, i) => {
						if (t.n.length) {
							return threads.concat([
								<button
									data-id={i}
									style={Object.assign({}, Style.thread, {
										backgroundColor: (state.threads.indexOf(i) !== -1) ? t.c : '#777'
									})}
									onClick={this.toggleFilter}
								>
									{t.n}
								</button>
							]);
						} else return threads;
					}, [])}
				</div>
				<div
					data-is="slices"
					style={Style.sliceSection}
				>
					{state.filtered.map((item, i) => (
						<div
							style={Object.assign({opacity: (state.deselected.indexOf(i) !== -1) ? '0.5' : '1' }, Style.scene, item.style)}
							onClick={() => select(i)}
						>
							{item.values.map((value) => (
								<span style={Style.span}>{value}</span>
							))}
						</div>
					))}
				</div>
				<div style={Style.row}>
					<button
						style={Style.item}
						onClick={() => {
							props.onDone();
						}}
					>
						cancel
					</button>
					<button
						style={Style.item}
						onClick={this.print}
					>
						print
					</button>
				</div>
			</ModalView>
		);
	}

	toggleFilter(event) {
		var id = Number(event.target.dataset.id),
			i = this.state.threads.indexOf(id);

		if (i === -1) this.state.threads.push(id);
		else this.state.threads.splice(i, 1);

		this.filter();
	}

	filter() {
		var filtered = this.props.project.s.reduce((slices, slice, i) => {
			var scenes = slice.h !== '' ?
				[
					{
						values: [slice.h],
						style: {
							color: '#000',
							backgroundColor: '#ccc'
						}
					}
				]
			:
				[];

			scenes = scenes.concat(
				slice.s.reduce((scenes, scene, i) => {
					if (scene && (this.state.threads.indexOf(i) !== -1) && scene.w !== 0) {
						scenes.push({
							values: [scene.h, scene.w + ' words'],
							body: scene.body,
							style: {
								color: '#fff',
								backgroundColor: this.props.project.t[i].c
							}
						});
					}
					return scenes;
				}, [])
			);

			if (scenes.length) return slices.concat(scenes);
			else return slices;

		}, []);

		this.setState({ filtered: filtered, deselected: [] });
	}

	select(index, i) {
		i = this.state.deselected.indexOf(index);

		if (i === -1) this.state.deselected.push(index);
		else this.state.deselected.splice(i, 1);

		this.forceUpdate();
	}

	print() {
		var printList,
			text,
			slices = this.props.project.s;

		printList = this.state.filtered.reduce((list, item, i) => {
			if (this.state.deselected.indexOf(i) === -1) list.push(item);
			return list;
		}, []);

		text = printList.reduce((body, item) => {
			if (item.body) return body + '\n\n' + item.body + '\n';
			else return body + '\n\n\n' + item.values[0] + '\n';
		}, this.props.project.t + '\n');

		FileSaver.saveAs(new Blob([text], {type: "text/plain;charset=utf-8"}), this.props.project.p + '_' + (new Date().toString()) + '.txt')
	
		this.props.onDone();
	}
}

module.exports = PrintModal;