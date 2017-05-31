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
			indices: [],
			project: Source.getLocal('weave-project'),
			store: Source.getLocal('weave-store')
		}

		if (this.state.project) this.state.project = JSON.parse(this.state.project);
		else this.state.project = { title: 'Welcome to Weave', totalWC: 4, storeSize: 0, historySize: 0 }

		if (this.state.store) this.state.store = JSON.parse(LZW.decompressFromUTF16(this.state.store));
		else this.state.store = {
			slices: [{datetime: '1999-10-26', notes: [{ thread: 0, head: 'Welcome to Weave!', body: 'This is the place!', wc: 4 }] }],
			threads: [{ color: '#00cc66', name: 'Barry Allen'}],
			locations: ['Star Labs']
		};

		Bind(this);

	}

	render(props, state) {
		if (state.isEditing) return (

			<div id="app" style={Style.app}>
				<AppMenu/>
				<NoteEditor
					note={state.targetNote}
					indices={state.indices}
					thread={state.store.threads[state.targetNote.thread]}
					menu={this.layoutMenu}
					onDone={this.onDone}
				/>
			</div>

		); else return (

			<div id="app" style={Style.app}>
				<AppMenu/>
				<WeaveView
					slices={state.store.slices}
					threads={state.store.threads}
					locations={state.store.locations}
					menu={this.layoutMenu}
					editNote={this.editNote}
				/>
			</div>
		)
	}

	editNote(sliceIndex, noteIndex) {
		this.setState({
			isEditing: true,
			indices: [sliceIndex, noteIndex],
			targetNote: this.state.store.slices[sliceIndex].notes[noteIndex],
		});
	}

	layoutMenu(childButtons) {
		var buttons = [];
		// add any buttons before?
		if (this.state.view !== 1) buttons.push([
			{ 
				name: 'title',
				text: 'W',
				click: function(event){
					console.log('You clicked: ' + event.currentTarget.name);
				}
			}
		]);
		// add child buttons
		if (childButtons !== undefined) buttons.push(childButtons);
		// add any buttons after?
		if (this.state.view === 1) buttons.push([
			{
				name: 'done',
				text: 'done',
				click: this.onDone
			}
		]);

		this.setState({ buttons: buttons });
	}

	onDone() {
		this.setState({
			targetNote: undefined,
			indices: [],
			isEditing: false
		});
	}

	do(action, data) {
		this.setState({ state: Actions[action](data, this.state.store)});
		this.save();
	}

	save() {
		Source.setLocal('weave-store', LZW.compressToUTF16(JSON.stringify(this.state.store)));
		Source.setLocal('weave-project', JSON.stringify(this.state.projects));
	}

	getChildContext() {
		return {
			do: this.do,
			menu: this.layoutMenu
		};
	}
}

React.render(<App/>, document.body);