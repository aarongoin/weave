require('./polyfills.js');
const
	React = require('preact'),
	FileSaver = require('file-saver'),

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
	};

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
			slices: [{datetime: '1999-10-26', notes: [{ thread: 0, head: 'Welcome to Weave!', body: 'This is the place!', wc: 4 }] }],
			threads: [{ color: '#00cc66', name: 'Barry Allen'}],
			locations: ['Star Labs']
		};

		Bind(this);

		this.state.project = Object.assign({title: this.state.project.title}, this.countProject());
		this.state.menuButton = this.projectButton();
		this.state.menuGroups = this.projectMeta();
	}

	countProject() {
		return {
			wordCount: this.state.store.slices.reduce((wc, slice) => 
				(wc + slice.notes.reduce((wc, note) => ((note) ? (wc + note.wc) : wc), 0))
			, 0),
			sceneCount: this.state.store.slices.reduce((scenes, slice) => 
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
		return (
			<div id="app" style={Style.app}>
				{(state.menuOpen ? 
					[<AppMenu
						groups={state.menuGroups}
						ref={(el) => {
							if (el && el.base.clientHeight != this.state.menuOffset) this.setState({ menuOffset: el.base.clientHeight });
						}}
					/>,
					(state.menuButton ? <button
						style={Object.assign({top: state.menuOffset, marginTop: '1px'}, Style.menuButton)}
						onClick={(e) => {
							if (state.menuButton.onClick) state.menuButton.onClick(e)
							this.setState({ menuOpen: false, menuOffset: '0rem' });
						}}
					>
						{state.menuButton.opened.value}
					</button> : "")]
					:
					<button
						style={Object.assign({top: '0rem'}, Style.menuButton)}
						onClick={(e) => {
							if (state.menuButton.closed.onClick) state.menuButton.closed.onClick(e)
							this.setState({ menuOpen: true, menuOffset: '2.5rem' });
						}}
					>
						{state.menuButton.closed.value}
					</button>
				)}
				{(state.isEditing ?
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
						slices={state.store.slices}
						threads={state.store.threads}
						locations={state.store.locations}
						menu={this.layoutMenu}
						editNote={this.editNote}
						windowWidth={window.innerWidth}
					/>
				)}
			</div>
		);
	}

	editNote(coords) {
		this.setState({
			isEditing: true,
			noteCoords: coords,
			targetNote: this.state.store.slices[coords.sliceIndex].notes[coords.noteIndex],
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
				AppMenu.btn('import', (event) => console.log("TODO!")),
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
				slices: [{datetime: '', notes: [null] }],
				threads: [{name: '', color: '#f60'}],
				locations: ['']
			}
		});
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