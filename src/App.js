require('./polyfills.js');
require('./assert.js').pollute(); // inject Assert and Test into window global object
const
	React = require('preact'),
	FileSaver = require('file-saver'),
	FileOpener = require('./components/FileOpener.js'),

	PrintModal = require('./components/PrintModal.js'),

	WeaveView = require('./components/WeaveView.js'),
	SceneWriter = require('./components/SceneWriter.js'),

	Bind = require('./bind.js'),
	LZW = require('lz-string'),
	Source = require('./Sourcery.js'),
	Actions = require('./actions.js'),
	Style = {
		app: 'width: 100vw;'
	},
	THREADS = [
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
			isPrinting: false,
			targetNote: undefined,
			sceneCoords: undefined,

			project: Source.getLocal('weave-project'),
			store: Source.getLocal('weave-store')
		}

		if (this.state.project) this.state.project = JSON.parse(this.state.project);
		else this.state.project = {
			title: 'Welcome to Weave',
			wordCount: 4,
			sceneCount: 1,
			author: 'Aaron Goin'
		};

		if (this.state.store) this.state.store = JSON.parse(LZW.decompressFromUTF16(this.state.store));
		else this.state.store = {
			slices: [{datetime: '1999-10-26', scenes: [{ thread: 0, head: 'Welcome to Weave!', body: 'This is the place!', wc: 4 }] }],
			threads: Object.assign([], THREADS),
			locations: ['Star Labs'],
			layout: [['Chapter One'], [0, 0]]
		};

		Bind(this);

		this.state.project = Object.assign(this.state.project, this.countProject());
	}

	countProject() {
		return {
			wordCount: this.state.store.slices.reduce((wc, slice) => 
				(wc + slice.scenes.reduce((wc, scene) => ((scene) ? (wc + scene.wc) : wc), 0))
			, 0),
			sceneCount: this.state.store.slices.reduce((scenes, slice) => 
				(scenes + slice.scenes.reduce((scenes, scene) => ((scene) ? (scenes + 1) : scenes), 0))
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
				<FileOpener
					ref={(el) => (this.FileOpener = el.base)}
					onChange={this.openProject}
				/>
				{(state.isEditing ?
					<SceneWriter
						scene={state.targetNote}
						coords={state.sceneCoords}
						thread={state.store.threads[state.targetNote.thread]}
						onDone={this.onDone}
					/>
				:
					<WeaveView
						title={state.project.title}
						author={state.project.author}
						slices={state.store.slices}
						threads={state.store.threads}
						locations={state.store.locations}
						editNote={this.editNote}
						windowWidth={window.innerWidth}
						projectFuncs={{
							onTitleChange: (event) => {
								this.state.project.title = event.target.value;
								this.forceUpdate();
								this.saveProject();
							},
							onAuthorChange: (event) => {
								this.state.project.author = event.target.value;
								this.forceUpdate();
								this.saveProject();
							},
							import: this.importProject,
							export: this.exportProject,
							print: () => this.setState({ isPrinting: true }),
							delete: this.delete
						}}
					/>
				)}
				{state.isPrinting ?
					<PrintModal
						slices={state.store.slices}
						threads={state.store.threads}
						cancel={() => this.setState({ isPrinting: false })}
					/>
				:
					''
				}
			</div>
		);
	}

	editNote(coords) {
		this.setState({
			isEditing: true,
			sceneCoords: coords,
			targetNote: this.state.store.slices[coords.sliceIndex].scenes[coords.sceneIndex],
		});
	}

	importProject() {
		this.FileOpener.click();
	}

	exportProject() {
		FileSaver.saveAs(new Blob([JSON.stringify(Object.assign({}, this.state.project, this.state.store))], {type: "text/plain;charset=utf-8"}), this.state.project.title + '.weave');
	}

	print(sceneList) {
		var text, slices = this.state.store.slices;
		this.setState({printing: false});

		text = sceneList.reduce((text, coords, i) => {
			return text + '\n\n\n' + i + '\n\n' + slices[coords.sliceIndex].scenes[coords.sceneIndex].body
		}, this.state.project.title);

		FileSaver.saveAs(new Blob([text], {type: "text/plain;charset=utf-8"}), this.state.project.title + '_' + (new Date().toString()) + '.txt')
	}

	onResize() {
		this.forceUpdate();
	}

	onDone() {
		this.setState({
			targetNote: null,
			sceneCoords: null,
			isEditing: false
		});
	}

	do(action, data) {
		this.state.store = Actions[action](data, this.state.store);
		this.state.project = Object.assign({}, this.state.project, this.countProject());
		this.forceUpdate();
		this.save();
	}

	delete() {
		this.setState({
			project: {
				title: '',
				author: '',
				wordCount: 0,
				sceneCount: 0
			},
			store: {
				slices: [{datetime: '', scenes: [null] }],
				threads: Object.assign([], THREADS),
				locations: [''],
				layout: [['Chapter One'], [0, 0]]
			}
		});
		this.save();
	}

	openProject(data) {
		data = JSON.parse(data);
		this.setState({
			project: { title: data.title, wordCount: data.wordCount, sceneCount: data.sceneCount, author: data.author },
			store: { slices: data.scenes, threads: data.threads, locations: data.locations }
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
			thread: (index) => {
				return this.state.store.threads[index];
			},
			do: this.do,
		};
	}
}

React.options.debounceRendering = window.requestAnimationFrame;

React.render(<App/>, document.body);