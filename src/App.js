require('./polyfills.js');
const CURRENT_VERSION = 'v0.9.0';
const
	React = require('preact'),

	FileSaver = require('file-saver'),

	WeaveView = require('./components/WeaveView.js'),

	ProjectSidebar = require('./components/ProjectSidebar.js'),

	NoteSidebar = require('./components/NoteSidebar.js'),

	Colors = require('./colors.js'),
	MapModel = require('./MapModel.js'),

	Bind = require('./bind.js'),
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

		this.focus = "";
		this.state = {
			modalView: 0,
			project: Source.getLocal('weave-project'),
			sceneMap: {},
			noteMap: [],
			fontSize: 13,
			sidebarTab: 0,
			sidebarToggled: true,
			notesToggled: true
		}

		Object.assign(this.state, JSON.parse(Source.getLocal('weave-appstate') || "{}"));

		if (this.state.project) this.state.project = JSON.parse(this.state.project);
		else {
			this.state.project = {};
			Actions.CreateProject({}, this.state.project);
		}

		// TODO -> if (!this.state.project.v || this.state.project.v !== CURRENT_VERSION) this.state.modalView = 4;

		Bind(this);

		this.Map();
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

	componentDidUpdate() {
		// save app state
		Source.setLocal('weave-appstate', JSON.stringify({
			fontSize: this.state.fontSize,
			sidebarTab: this.state.sidebarTab,
			sidebarToggled: this.state.sidebarToggled,
			notesToggled: this.state.notesToggled
		}));
	}

	render(props, state, context) {
		return (
			<div
				id="app"
				style={state.modalView ? Object.assign({overflow: 'hidden'}, Style.app) : Style.app}
			>
				<ProjectSidebar
					toggled={state.sidebarToggled}
					project={state.project}
					scenes={state.sceneMap.sceneCount}
					notes={state.noteMap.length}
					tab={state.sidebarTab}
					onTab={(tab) => this.setState({sidebarTab: tab})}
					print={this.print}
				/>
				<WeaveView
					thread={state.project.thread}
					map={state.sceneMap}
					sceneCount={state.sceneMap.sceneCount}
				/>
				<NoteSidebar
					toggled={state.notesToggled}
					notes={state.noteMap}
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
				
			} else if (e.keyCode === 90) {
				e.preventDefault();
				//special case (CTRL-SHIFT-Z) does a redo (on a mac for example)
				if (e.shiftKey === true) this.Redo();
				else this.Undo();
			}
			if (e.keyCode === 66) {
				e.preventDefault();
				this.setState({sidebarToggled: !this.state.sidebarToggled});
			}
			if (e.keyCode === 75) {
				e.preventDefault();
				this.setState({notesToggled: !this.state.notesToggled});
			}
			if (e.keyCode === 70) {
				e.preventDefault();
				this.setState({sidebarTab: 2, sidebarToggled: true});
				window.document.getElementById("searchBar").focus();
			}
			if (e.keyCode === 187) {
				e.preventDefault();
				window.document.firstElementChild.style.fontSize = Number(++this.state.fontSize).toString() + "px";
				this.cueRender();
			}
			if (e.keyCode === 189) {
				e.preventDefault();
				window.document.firstElementChild.style.fontSize = Number(--this.state.fontSize).toString() + "px";
				this.cueRender();
			}
			//console.log("Key " + e.keyCode);
		}
	}

	Do(action, data) {
		// new item id to focus on or undefined
		this.focus = Actions.Do(action, data, this.state.project);
		this.Map();
		this.save();
		if (action === "ModifyChapters") this.cueRender();
		if (action.startsWith("New") || action.startsWith("Create")) {
			this.cueRender();
		}
	}

	Undo() {	
		Actions.Undo(this.state.project)
		this.Map();
		this.save();
	}

	Redo() {
		Actions.Redo(this.state.project)
		this.Map();
		this.save();
	}

	Map() {
		this.setState({
			sceneMap: MapModel.Scenes(this.state.project.scene, this.state.project.location, this.state.project.visible, this.state.project.search, this.state.project, this.Get),
			noteMap: MapModel.Notes(this.state.project.note, this.state.project.visible, this.state.project.search, this.Get)
		});
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
		this.setState(Object.assign(data));
		this.Map();
		this.save();
	}

	save() {
		Source.setLocal('weave-project', JSON.stringify(this.state.project));
	}

	doesTimeConflict(location, utctime, sceneid) {
		var scene = this.state.project.scene;
		for (var id in scene) {
			if (scene[id].location === location && id !== sceneid && scene[id].utctime === utctime) return true;
		}
		return false;
	}

	eatFocus() {
		this.focus = undefined;
	}

	focusOn(id) {
		this.focus = id;
		this.cueRender();
	}

	getChildContext() {
		return {
			Get: this.Get,
			Do: this.Do,
			doesTimeConflict: this.doesTimeConflict,
			focus: this.focus,
			focusOn: this.focusOn,
			eatFocus: this.eatFocus,
			fontSize: this.state.fontSize
		};
	}

	print() {
		var settings = this.state.project.printSettings,
			meta = this.state.project.meta,
			text = "",
			scene,
			threads,
			i = -1;

		text += "\n\n\n" + meta.title + "\n\n";
		if (meta.author.length > 0) text += "by: " + meta.author;
		text += "\n\n\n\n";

		// iterate through each scene within each chapter
		for (var chapter of this.state.project.chapters) {

			text += "Chapter " + (++i) + ". " + chapter.title + "\n\n\n";

			for (var scene_id of chapter.scenes) {
				scene = this.Get(scene_id);

				if (settings.location) text += this.Get(scene.location).name;
				if (settings.date) text += " - " + scene.time + "\n\n";

				if (settings.threads) {
					threads = Object.keys(scene.thread);
					for (var thread_id of threads) text += this.Get(thread_id).name + "  ";
					text += scene.thread + "\n\n"
				}

				if (settings.summary) text += scene.summary + "\n\n";

				if (settings.body) {
					text += "*\n\n"
					text += scene.body + "\n\n";
				}

				text += "* * *\n\n"
			}

			text += "\n\n\n";
		}

		FileSaver.saveAs(new Blob([text], {type: "text/plain;charset=utf-8"}), this.state.project.meta.title + '_' + (new Date().toString()) + '.txt');	
	}
}

React.options.debounceRendering = window.requestAnimationFrame;

React.render(<App/>, document.body);