require('./polyfills.js');
//require('../assert.js').pollute(); // inject Assert and Test into window global object
const CURRENT_VERSION = 'v0.9.0';
const
	React = require('preact'),

	ProjectModal = require('./components/ProjectModal.js'),
	PrintModal = require('./components/PrintModal.js'),
	WelcomeModal = require('./components/WelcomeModal.js'),

	WeaveView = require('./components/WeaveView.js'),
	SceneWriter = require('./components/SceneWriter.js'),

	Colors = require('./colors.js'),

	Bind = require('./bind.js'),
	LZW = require('lz-string'),
	Source = require('./Sourcery.js'),
	Actions = require('./actions.js'),
	Style = {
		app: {
			minWidth: '100vw',
			position: 'relative'
		},
		titleSpace: {
			position: 'absolute',
			left: 0,
			top: 0,
			height: '8rem',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center'
		},
		projectButton: {
			
			minHeight: '2.5rem',
			padding: '0.5rem 0.75rem',
			width: '8rem',
			
			outline: 'none',
			backgroundColor: '#fff',

			border: 'none',

			color: '#000',
			fontSize: '1.2rem',

			cursor: 'pointer'
		}
	};

class App extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			currentView: 1,
			focusedScene: null,
			modalView: 0,
			project: Source.getLocal('weave-project'),
		}

		if (this.state.project) this.state.project = JSON.parse(LZW.decompressFromUTF16(this.state.project));
		else this.state.project = {
			p: 'Welcome to Weave',
			a: 'Aaron Goin',
			w: 4,
			c: 1,
			s: [{h: 'Chapter One', s: [{ h: 'Introduction to Weave', b: 'Welcome to Weave!', w: 4 , l: 'Bedroom'}] }],
			t: [{ n: 'Harry Potter', c: Colors.random() }]
		};

		if (!this.state.project.v || this.state.project.v !== CURRENT_VERSION) this.state.modalView = 4;

		Bind(this);
	}

	countProject() {
		return {
			wordCount: this.state.project.s.reduce((wc, slice) => 
				(wc + slice.s.reduce((wc, scene) => ((scene) ? (wc + scene.w) : wc), 0))
			, 0),
			sceneCount: this.state.project.s.reduce((scenes, slice) => 
				(scenes + slice.s.reduce((scenes, scene) => ((scene) ? (scenes + 1) : scenes), 0))
			, 0)
		};
	}

	componentDidMount() {
		window.addEventListener('resize', this.onResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.onResize);
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

	render(props, state) {
		switch (state.currentView) {
			case 1: return (
				<div id="app" style={state.modalView ? Object.assign({overflow: 'hidden'}, Style.app) : Style.app}>
					<WeaveView
						project={state.project}
						focusedScene={state.focusedScene}
						onSelect={(coords) => this.setState({focusedScene: coords})}
						onDeselect={() => this.setState({focusedScene: null})}
						onEditScene={(coords) => this.setState({currentView: 2, focusedScene: coords})}
					/>
					<div style={Style.titleSpace}>
						<button
							style={Style.projectButton}
							onClick={() => this.setState({ modalView: 1 })}
						>
							{state.project.p.length ? state.project.p : 'Project Title'}
						</button>
					</div>
					{this.renderModal(props, state)}
				</div>
			);
			case 2: return (
				<div id="app" style={state.modalView ? Object.assign({overflow: 'hidden'}, Style.app) : Style.app}>
					<SceneWriter
						coords={state.focusedScene}
						scene={state.project.s[state.focusedScene.sliceIndex].s[state.focusedScene.sceneIndex]}
						thread={state.project.t[state.focusedScene.sceneIndex]}
						onDone={()=> this.setState({
							currentView: 1,
							focusedScene: null
						})}
					/>
				</div>
			);
		}
	}

	onResize() {
		this.cueRender();
	}

	do(action, data) {
		this.state.project = Actions[action](data, this.state.project);
		this.state.project = Object.assign({}, this.state.project, this.countProject());
		this.cueRender();
		this.save();
	}

	openProject(data) {
		data = JSON.parse(data);
		this.setState(data)
		this.save();
	}

	save() {
		Source.setLocal('weave-project', LZW.compressToUTF16(JSON.stringify(this.state.project)));
	}

	getChildContext() {
		return {
			thread: (index) => {
				return this.state.project.t[index];
			},
			do: this.do,
		};
	}
}

React.options.debounceRendering = window.requestAnimationFrame;

React.render(<App/>, document.body);