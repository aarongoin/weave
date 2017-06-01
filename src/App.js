require('./polyfills.js');
const
	React = require('preact'),
	AppMenu = require('./components/AppMenu.js'),
	WeaveView = require('./components/WeaveView.js'),
	NoteEditor = require('./components/NoteEditor.js'),

	Bind = require('./bind.js'),
	LZW = require('./lz-string.js'),
	Source = require('./Sourcery.js'),
	Actions = require('./actions.js'),
	Style = {
		app: 'width: 100vw;'
	};

class App extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {

			isEditing: false,
			targetNote: undefined,
			noteCoords: undefined,

			menuOffset: '0rem',
			menuGroups: [],

			project: Source.getLocal('weave-project'),
			store: Source.getLocal('weave-store')
		}

		if (this.state.project) this.state.project = JSON.parse(this.state.project);
		else this.state.project = { title: 'Welcome to Weave', wordCount: 4, sceneCount: 1, historySize: 0 }

		if (this.state.store) this.state.store = JSON.parse(LZW.decompressFromUTF16(this.state.store));
		else this.state.store = {
			slices: [{datetime: '1999-10-26', notes: [{ thread: 0, head: 'Welcome to Weave!', body: 'This is the place!', wc: 4 }] }],
			threads: [{ color: '#00cc66', name: 'Barry Allen'}],
			locations: ['Star Labs']
		};

		this.state.project = Object.assign({title: this.state.project.title}, this.countProject());

		Bind(this);
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

	render(props, state) {
		return (
			<div id="app" style={Style.app}>
				<AppMenu
					groups={(state.menuGroups.length ? state.menuGroups : this.projectMeta())}
					setOffset={(offset) => this.setState({ menuOffset: offset })}
				/>
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
						canSelectMany={false}
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
			menuGroups: []
		});
	}

	projectMeta() {
		return [
			{ 
				closed: {
					value: this.state.project.title
				},
				opened: {
					value: 'done'
				}
			},[
				{ 
					value: this.state.project.title,
					onInput: (event) => {
						this.state.project.title = event.target.value;
						this.forceUpdate();
						this.saveProject();
					}
				},{
					value: this.state.project.sceneCount + ' scenes'
				},{
					value: this.state.project.wordCount + ' words'
				}
			],[
				{
					value: 'new',
					onClick: (event) => console.log("TODO!")
				},{
					value: 'import',
					onClick: (event) => console.log("TODO!")
				},{
					value: 'export',
					onClick: (event) => console.log("TODO!")
				},{
					value: 'print',
					onClick: (event) => console.log("TODO!")
				}


			]
		];
	}

	onDone() {
		this.setState({
			targetNote: undefined,
			noteCoords: [],
			isEditing: false,
			projectMeta: true,
			menuGroups: []
		});
	}

	do(action, data) {
		this.setState({
			state: Actions[action](data, this.state.store),
			project: Object.assign({}, this.state.project, this.countProject())
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
			useMenu: (menuGroups) => this.setState({ menuGroups: menuGroups }),
			releaseMenu: () => this.setState({ menuGroups: [] }),
			modal: (contents) => this.setState({ modal: contents })
		};
	}
}

React.render(<App/>, document.body);