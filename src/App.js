const
	React = require('preact'),
	AppMenu = require('./components/AppMenu.js'),
	WeaveView = require('./components/WeaveView.js'),
	NoteEditor = require('./components/NoteEditor.js'),

	Style = {
		app: 'width: 100vw;'
	};


class App extends React.Component {
	constructor(props, context) {
		super(props);
		this.state = {
			isEditing: false,
			targetNote: undefined,
			buttons: []
		}

		this.editNote = this.editNote.bind(this);
		this.layoutMenu = this.layoutMenu.bind(this);
		this.onDone = this.onDone.bind(this);

	}

	componentDidMount() {
		window.onbeforeunload = function() {
			window.removeEventListener('keyup', keyHandler);
		};
	}

	render(props, state) {
		if (state.isEditing) return (

			<div id="app" style={Style.app}>
				<AppMenu buttons={state.buttons}/>
				<NoteEditor
					note={state.targetNote}
					menu={this.layoutMenu}
				/>
			</div>

		); else return (

			<div id="app" style={Style.app}>
				<AppMenu buttons={state.buttons}/>
				<WeaveView
					menu={this.layoutMenu}
					editNote={this.editNote}
					onDone={this.onDone}
				/>
			</div>
		)
	}

	editNote(note) {
		this.setState({
			isEditing: true,
			targetNote: note,
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
			isEditing: false
		});
		this.state.store.localStorage[this.note.id] = this.noteBody;
	}
}

module.exports = App;