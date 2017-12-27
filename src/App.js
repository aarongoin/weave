require('./polyfills.js');
//require('../assert.js').pollute(); // inject Assert and Test into window global object
const CURRENT_VERSION = 'v0.9.0';
const
	React = require('preact'),

	PrintModal = require('./components/PrintModal.js'),
	WelcomeModal = require('./components/WelcomeModal.js'),

	WeaveView = require('./components/WeaveView.js'),
	SceneWriter = require('./components/SceneWriter.js'),

	ProjectSidebar = require('./components/ProjectSidebar.js'),

	NoteSidebar = require('./components/NoteSidebar.js'),

	Colors = require('./colors.js'),
	MapModel = require('./MapModel.js'),

	Bind = require('./bind.js'),
	LZW = require('lz-string'),
	Source = require('./Sourcery.js'),
	Actions = require('./actions.js'),
	Style = {
		app: {
			position: 'relative',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'flex-start',
			minWidth: '100vw',
			height: '100vh'
		}
	};

class App extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			modalView: 0,
			project: Source.getLocal('weave-project'),
		}

		//if (this.state.project) this.state.project = JSON.parse(LZW.decompressFromUTF16(this.state.project));
		if (this.state.project) this.state.project = JSON.parse(this.state.project);
		else {
			this.state.project = {};
			Actions.CreateProject({}, this.state.project);
			Actions.CreateLocation({id: 'lTest', name:'Hogwarts'}, this.state.project);
			Actions.ModifyLocationList({0: 'lTest'}, this.state.project);
			this.state.project.visible['lTest'] = true;
			Actions.CreateScene({id: 's1000', summary: 'Harry heads back to Hogwarts!', location: 'lTest', time: '1991-01-07'}, this.state.project);
			Actions.CreateScene({id: 's1001', summary: 'Harry poops on Snape.', location: 'lTest', time: '2001-08-30'}, this.state.project);
			Actions.CreateNote({tag:{'lTest': true}}, this.state.project);
		}

		// TODO -> if (!this.state.project.v || this.state.project.v !== CURRENT_VERSION) this.state.modalView = 4;

		Bind(this);
	}

	countProject() {
		return {
			w: this.state.project.s.reduce((wc, slice) => 
				(wc + slice.s.reduce((wc, scene) => ((scene) ? (wc + scene.w) : wc), 0))
			, 0),
			c: this.state.project.s.reduce((scenes, slice) => 
				(scenes + slice.s.reduce((scenes, scene) => ((scene) ? (scenes + 1) : scenes), 0))
			, 0)
		};
	}

	componentDidMount() {
		window.addEventListener('resize', this.onResize);
		window.addEventListener('keydown', this.onKeyDown);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.onResize);
		window.removeEventListener('keydown', this.onKeyDown);
	}

	renderModal(props, state) {
		switch (state.modalView) {
			case 0: return ('');
			case 1: return (
				<ProjectModal
					project={state.project}
					onPrint={() => this.setState({ modalView: 2 })}
					onDone={() => this.setState({ modalView: 0 })}
				/>
			);
			case 2: return (
				<PrintModal
					project={state.project}
					onDone={() => this.setState({ modalView: 0 })}
				/>
			);
			case 3: return (
				<HelpModal
					project={state.project}
					onDone={() => this.setState({ modalView: 0 })}
				/>
			);
			case 4: return (
				<WelcomeModal
					project={state.project}
					onDone={() => this.setState({ modalView: 0 })}
				/>
			);
		}
	}

	render(props, state, context) {
		return (
			<div
				id="app"
				style={state.modalView ? Object.assign({overflow: 'hidden'}, Style.app) : Style.app}
			>
				<ProjectSidebar
					project={state.project}
					register={(c) => this.mainSB = c}
				/>
				<WeaveView
					thread={state.project.thread}
					map={MapModel.Scenes(state.project.scene, state.project.location, state.project.visible, state.project.search, state.project)}
				/>
				<NoteSidebar
					notes={MapModel.Notes(state.project.note, state.project.visible, state.project.search)}
					register={(c) => this.notesSB = c}
				/>
			</div>
		);
	}

	onResize() {
		this.cueRender();
	}

	onKeyDown(e) {
		if (e.metaKey === true || e.ctrlKey === true) {
			if (e.keyCode === 89) {
				e.preventDefault();
				this.Redo();
			} else if (e.keyCode === 90) {
				e.preventDefault();
				//special case (CTRL-SHIFT-Z) does a redo (on a mac for example)
				if (e.shiftKey === true) this.Redo();
				else this.Undo();
			}
			if (e.keyCode === 66) {
				e.preventDefault();
				this.mainSB();
			}
			if (e.keyCode === 75) {
				e.preventDefault();
				this.notesSB();
			}
		}
	}

	Do(action, data) {
		Actions.Do(action, data, this.state.project);
		this.cueRender();
		this.save();
	}

	Undo() {
		Actions.Undo(this.state.project)
		this.cueRender();
		this.save();
	}

	Redo() {
		Actions.Redo(this.state.project)
		this.cueRender();
		this.save();
	}

	Get(id) {
		switch (id.charAt(0)) {
			case 's': return this.state.project.scene[id];
			case 'l': return this.state.project.location[id];
			case 't': return this.state.project.thread[id];
			case 'n': return this.state.project.note[id];
			case 'f': return this.state.project.folder[id];
			default: return null;
		}
	}

	openProject(data) {
		data = JSON.parse(data);
		this.setState(data)
		this.save();
	}

	save() {
		var str = JSON.stringify(this.state.project);
		console.log("Uncompressed: " + str.length);
		//str = LZW.compressToUTF16(str);
		//console.log("Compressed: " + str.length)
		Source.setLocal('weave-project', str);
		console.log(JSON.stringify(localStorage).length / 2636625);
	}

	getChildContext() {
		return {
			Get: this.Get,
			Do: this.Do,
		};
	}
}

React.options.debounceRendering = window.requestAnimationFrame;

React.render(<App/>, document.body);