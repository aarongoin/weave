const
	Version = '0.9.0b'
	React = require('preact'),
	Store = require('./components/Store.js'),
	Project = Store.Store.present,

	SceneWriter = require('./components/SceneWriter.js'),
	WeaveView = require('./components/WeaveView.js'),
	WeaveHeaders = require('./WeaveHeaders.js'),
	WeaveBackground = require('./WeaveBackground.js'),

	ProjectModal = require('./ProjectModal.js'),
	PrintModal = require('./PrintModal.js'),

	Style = {
		app: {
			minWidth: '100vw'
		},
		projectButton: {
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

class App extends Store.Component {
	constructor() {
		super();

		this.state = {
			currentView: 2,
			focusedScene: null,
			modalView: 0,
			projectModal: false,
			printModal: false,
			welcomeModal:
		};
	}

	renderModal(props, state) {
		switch (state.modalView) {
			case 0: return ('');
			case 1: return (
				<ProjectModal
					project={Project}
					onDone={() => this.setState({ modalView: 0 })}
				/>
			);
			case 2: return (
				<PrintModal
					project={Project}
					cancel={() => this.setState({ modalView: 0 })}
				/>
			);
			case 3: return (
				<HelpModal
					project={Project}
					done={() => this.setState({ modalView: 0 })}
				/>
			);
			case 4: return (
				<WelcomeModal
					project={Project}
					done={() => this.setState({ modalView: 0 })}
				/>
			);
		}
		return (state.projectModal ?
			
		: (state.printModal ?
			
		: ''
		))
	}

	render(props, state) {
		switch (state.currentView) {
			case 1: return (
				<div id="app" style={Style.app}>
					<SceneWriter
						focusedScene={Store.Store.threads[state.focusedScene[0]].scenes[state.focusedScene[1]]}
						onDone={()=> this.setState({
							currentView: 2,
							focusedScene: null
						})}
					/>
				</div>
			);
			case 2: return (
				<div id="app" style={Style.app}>
					<WeaveView
						project={Project}
						focusedScene={state.focusedScene}
						editScene={(scene) => this.setState({
							currentView: 1,
							focusedScene: scene
						})}
						onSelect={(coords) => this.setState({focusedScene: coords})}
						onDeselect={() => this.setState({focusedScene: null})}
					/>
					<button
						style={Style.projectButton}
						onClick={() => this.setState({ projectModal: true })}
					>
						{props.project.t.length ? props.project.t : 'Project Title'}
					</button>
					{this.renderModal(props, state)}
				</div>
			);
		}
	}
}

React.options.debounceRendering = window.requestAnimationFrame;

React.render(<App/>, document.body);






