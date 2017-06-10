require('./polyfills.js');
require('./assert.js').pollute(); // inject Assert and Test into window global object
const
	React = require('preact'),
	FileSaver = require('file-saver'),
	FileOpener = require('./components/FileOpener.js'),

	PrintModal = require('./components/PrintModal.js'),

	WeaveView = require('./components/WeaveView.js'),
	SceneWriter = require('./components/SceneWriter.js'),

	Colors = require('./colors.js'),

	Bind = require('./bind.js'),
	LZW = require('lz-string'),
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
			isPrinting: false,
			targetNote: undefined,
			sceneCoords: undefined,

			project: Source.getLocal('weave-project'),
		}

		if (this.state.project) this.state.project = JSON.parse(LZW.decompressFromUTF16(this.state.project));
		else this.state.project = {
			title: 'Welcome to Weave',
			author: 'Aaron Goin',
			wordCount: 4,
			sceneCount: 1,
			slices: [{datetime: '1999-10-26', scenes: [{ head: 'Introduction to Weave', body: 'Welcome to Weave!', wc: 4 , location: 'Bedroom'}] }],
			threads: [{ name: 'Harry Potter', color: Colors.random() }],
			headers: ['']
		};

		Bind(this);
	}

	countProject() {
		return {
			wordCount: this.state.project.slices.reduce((wc, slice) => 
				(wc + slice.scenes.reduce((wc, scene) => ((scene) ? (wc + scene.wc) : wc), 0))
			, 0),
			sceneCount: this.state.project.slices.reduce((scenes, slice) => 
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
						thread={state.project.threads[state.sceneCoords.sceneIndex]}
						onDone={this.onDone}
					/>
				:
					<WeaveView
						project={this.state.project}
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
						slices={state.project.slices}
						threads={state.project.threads}
						headers={state.project.headers}
						cancel={() => this.setState({ isPrinting: false })}
						print={this.print}
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
			targetNote: this.state.project.slices[coords.sliceIndex].scenes[coords.sceneIndex],
		});
	}

	importProject() {
		this.FileOpener.click();
	}

	exportProject() {
		FileSaver.saveAs(new Blob([JSON.stringify(this.state.project)], {type: "text/plain;charset=utf-8"}), this.state.project.title + '.weave');
	}

	print(printList) {
		var text, slices = this.state.project.slices;
		this.setState({printing: false});

		text = printList.reduce((body, item) => {
			if (item.body) return body + '\n\n' + item.body + '\n';
			else return body + '\n\n\n' + item.values[0] + '\n';
		}, this.state.project.title + '\n');

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
		this.state.project = Actions[action](data, this.state.project);
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
				sceneCount: 0,
				slices: [],
				threads: [],
				headers: []
			}
		});
		this.save();
	}

	openProject(data) {
		data = JSON.parse(data);
		this.setState(data)
		this.save();
	}

	save() {
		this.saveProject();
	}

	saveProject() {
		Source.setLocal('weave-project', LZW.compressToUTF16(JSON.stringify(this.state.project)));
	}

	getChildContext() {
		return {
			thread: (index) => {
				return this.state.project.threads[index];
			},
			do: this.do,
		};
	}
}

React.options.debounceRendering = window.requestAnimationFrame;

React.render(<App/>, document.body);