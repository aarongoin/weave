require('./polyfills.js');
require('./assert.js').pollute(); // inject Assert and Test into window global object
const
	React = require('preact'),
	FileSaver = require('file-saver'),
	FileOpener = require('./components/FileOpener.js'),

	AppMenu = require('./components/AppMenu.js'),
	WeaveView = require('./components/WeaveView.js'),
	NoteEditor = require('./components/NoteEditor.js'),

	Bind = require('./bind.js'),
	LZW = require('lz-string'),
	Source = require('./Sourcery.js'),
	Actions = require('./actions.js'),
	Style = {
		app: 'width: 100vw;',
		menuButton: {
			zIndex: 22,
			minHeight: '2.5rem',
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
	},
	THREADS = [
		{ name: '', color: '#000000' },
		{ name: '', color: '#333333' },
		{ name: '', color: '#666666' },
		{ name: '', color: '#999999' },
		{ name: '', color: '#b21f35' },
		{ name: '', color: '#d82735' },
		{ name: '', color: '#ff7435' },
		{ name: '', color: '#ffa135' },
		{ name: '', color: '#ffcb35' },
		{ name: '', color: '#00753a' },
		{ name: '', color: '#009e47' },
		{ name: '', color: '#16dd36' },
		{ name: '', color: '#0052a5' },
		{ name: '', color: '#0079e7' },
		{ name: '', color: '#06a9fc' },
		{ name: '', color: '#681e7e' },
		{ name: '', color: '#7d3cb5' },
		{ name: '', color: '#bd7af6' }
	];

class App extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {

			isEditing: false,
			targetNote: undefined,
			noteCoords: undefined,

			menuOpen: false,
			menuOffset: '0rem',
			menuGroups: [],
			menuButton: {},

			project: Source.getLocal('weave-project'),
			store: Source.getLocal('weave-store')
		}

		if (this.state.project) this.state.project = JSON.parse(this.state.project);
		else this.state.project = { title: 'Welcome to Weave', wordCount: 4, sceneCount: 1}

		if (this.state.store) this.state.store = JSON.parse(LZW.decompressFromUTF16(this.state.store));
		else this.state.store = {
			scenes: [{datetime: '1999-10-26', notes: [{ thread: 0, head: 'Welcome to Weave!', body: 'This is the place!', wc: 4 }] }],
			threads: Object.assign([], THREADS),
			locations: ['Star Labs']
		};

		Bind(this);

		this.state.project = Object.assign({title: this.state.project.title}, this.countProject());
		this.state.menuButton = this.projectButton();
		this.state.menuGroups = this.projectMeta();
	}

	countProject() {
		return {
			wordCount: this.state.store.scenes.reduce((wc, slice) => 
				(wc + slice.notes.reduce((wc, note) => ((note) ? (wc + note.wc) : wc), 0))
			, 0),
			sceneCount: this.state.store.scenes.reduce((scenes, slice) => 
				(scenes + slice.notes.reduce((scenes, note) => ((note) ? (scenes + 1) : scenes), 0))
			, 0)
		};
	}

	componentDidMount() {
		window.addEventListener('resize', this.onResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.onResize);
	}

	render(props, state) {
		var children = [
			<FileOpener
				ref={(el) => (this.FileOpener = el.base)}
				onChange={this.openProject}
			/>
		];

		if (state.menuOpen) {
			children.push(
				<AppMenu
					groups={state.menuGroups}
					ref={(el) => {
						if (el && el.base.clientHeight != this.state.menuOffset) this.setState({ menuOffset: el.base.clientHeight });
					}}
				/>
			);
			if (state.menuButton) children.push(
				<button
					style={Object.assign({top: state.menuOffset, marginTop: '1px'}, Style.menuButton)}
					onClick={(e) => {
						if (state.menuButton.onClick) state.menuButton.onClick(e)
						this.setState({ menuOpen: false, menuOffset: '0rem' });
					}}
				>
					{state.menuButton.opened.value}
				</button>
			);
		} else children.push(
			<button
				style={Object.assign({top: '0rem'}, Style.menuButton)}
				onClick={(e) => {
					if (state.menuButton.closed.onClick) state.menuButton.closed.onClick(e)
					this.setState({ menuOpen: true, menuOffset: '2.5rem' });
				}}
			>
				{state.menuButton.closed.value}
			</button>
		);

		children.push(state.isEditing ?
			<NoteEditor
				menuOffset={state.menuOffset}
				note={state.targetNote}
				coords={state.noteCoords}
				thread={state.store.threads[state.targetNote.thread]}
				menu={this.layoutMenu}
				onDone={this.onDone}
			/>
		:
			<WeaveView
				menuOffset={state.menuOffset}
				scenes={state.store.scenes}
				threads={state.store.threads}
				locations={state.store.locations}
				menu={this.layoutMenu}
				editNote={this.editNote}
				windowWidth={window.innerWidth}
			/>
		);

		return (
			<div id="app" style={Style.app}>
				{children}
			</div>
		);
	}

	editNote(coords) {
		this.setState({
			isEditing: true,
			noteCoords: coords,
			targetNote: this.state.store.scenes[coords.sliceIndex].notes[coords.noteIndex],
			menuOpen: true 
		});
	}

	projectButton() {
		return AppMenu.main(AppMenu.text('done'), AppMenu.text(this.state.project.title.length ? this.state.project.title : 'Project'));
	}

	projectMeta() {
		return [
			[
				AppMenu.input('Project Title', this.state.project.title, (event) => {
					this.state.project.title = event.target.value;
					this.setState({ menuGroups: this.projectMeta(event.target.value), menuButton: this.projectButton() });
					this.saveProject();
				})
			],[
				AppMenu.text(this.state.project.sceneCount + ' scenes'),
				AppMenu.text(this.state.project.wordCount + ' words')
			],[
				AppMenu.btn('import', (event) => this.FileOpener.click()),
				AppMenu.btn('export', (event) => FileSaver.saveAs(new Blob([JSON.stringify(Object.assign({}, this.state.project, this.state.store))], {type: "text/plain;charset=utf-8"}), this.state.project.title + '.weave')),
				AppMenu.btn('print', (event) => console.log("TODO!"))
			],
			[AppMenu.deleteBtn(this.delete)]
		];
	}

	onResize() {
		this.forceUpdate();
	}

	onDone() {
		this.setState({
			targetNote: null,
			noteCoords: null,
			isEditing: false,
			menuOpen: false,
			menuButton: this.projectButton(),
			menuGroups: this.projectMeta(),
			menuOffset: '0rem' 
		});
	}

	do(action, data) {
		this.state.store = Actions[action](data, this.state.store);
		this.state.project = Object.assign({}, this.state.project, this.countProject());
		this.setState({
			menuGroups: (this.state.menuGroups[0][0].onInput) ? this.projectMeta() : this.state.menuGroups
		});
		this.save();
	}

	delete() {
		this.state.project = {
			title: 'Project Title',
			wordCount: 0,
			sceneCount: 0
		};
		this.setState({
			menuOpen: false,
			menuButton: this.projectButton(),
			menuGroups: this.projectMeta(),
			menuOffset: '0rem',
			store: {
				scenes: [{datetime: '', notes: [null] }],
				threads: Object.assign([], THREADS),
				locations: ['']
			}
		});
		this.save();
	}

	openProject(data) {

		data = JSON.parse(data);
		this.state.project = { title: data.title, wordCount: data.wordCount, sceneCount: data.sceneCount };
		this.state.store = { scenes: data.scenes, threads: data.threads, locations: data.locations };
		this.setState({
			menuOpen: false,
			menuButton: this.projectButton(),
			menuGroups: this.projectMeta(),
			menuOffset: '0rem',
		})
		this.save();
	}

	save() {
		this.saveProject();
		this.saveStore();
	}

	saveProject() {
		Source.setLocal('weave-project', JSON.stringify(this.state.project));
	}

	saveStore() {
		Source.setLocal('weave-store', LZW.compressToUTF16(JSON.stringify(this.state.store)));
	}

	getChildContext() {
		return {
			do: this.do,
			useMenu: (menuButton, menuGroups) => this.setState({ menuOpen: true, menuButton: menuButton, menuGroups: menuGroups, menuOffset: '2.5rem' }),
			releaseMenu: () => this.setState({ menuOpen: false, menuButton: this.projectButton(), menuGroups: this.projectMeta(), menuOffset: '0rem' }),
			modal: (contents) => this.setState({ modal: contents })
		};
	}
}

React.options.debounceRendering = window.requestAnimationFrame;

React.render(<App/>, document.body);