<style>

	
	#app {
		width: 100vw;		
	}

</style>
<template>

	<div id="app">
		<app-menu
			:buttons="buttons"></app-menu>
		<weave-view 
			v-if="view === 0" 
			:store="store"
			:menu="layoutMenu"
			:editFunc="editNote"
		></weave-view>
		<note-editor 
			v-else-if="view === 1" 
			:note="note"
			:noteBody="noteBody"
			:updateBody="updateBody"
			:menu="layoutMenu"
			:thread="store.threads[note.thread]"
		></note-editor>
	</div>

</template>
<script>

	const 
		AppMenu = require('./components/AppMenu.vue'),
		WeaveView = require('./components/WeaveView.vue'),
		NoteEditor = require('./components/NoteEditor.vue'),
		Store = require('./store.js'),
		MOCK = require('./MOCK.js');

	module.exports = {
		name: 'app',
		components: {
			AppMenu: AppMenu,
			WeaveView: WeaveView,
			NoteEditor: NoteEditor
		},
		data: function() { return {
			store: MOCK,
			view: 0,
			prev: 0,
			note: undefined,
			noteBody: undefined,
			buttons: []
		}},
		mount: function() {
			window.onbeforeunload = function() {
				store.saveLocal();
				window.removeEventListener('keyup', keyHandler);
			};
		},
		methods: {
			editNote: function(note) {
				this.note = note;
				this.prev = this.view;
				this.view = 1;
				//Store.userWillRead(note);
				this.noteBody = this.store.localStorage[note.id] || '';

			},
			restoreView: function() {
				this.note = undefined;
				this.view = this.prev;
				this.prev = undefined;

			},
			layoutMenu: function(childButtons) {
				this.buttons = [];
				// add any buttons before?
				if (this.view !== 1) this.buttons.push([
					{ 
						name: 'title',
						text: 'W',
						click: function(event){
							console.log('You clicked: ' + event.currentTarget.name);
						}
					}
				]);
				// add child buttons
				if (childButtons !== undefined) this.buttons.push(childButtons);
				// add any buttons after?
				if (this.view === 1) this.buttons.push([
					{
						name: 'done',
						text: 'done',
						click: this.onDone
					}
				]);
			},
			updateBody: function(body) {
				this.noteBody = body;
			},
			onDone: function() {
				this.store.localStorage[this.note.id] = this.noteBody;
				this.note = undefined;
				this.noteBody = undefined;
				this.view = this.prev;
				this.prev = undefined;
			}
		}
	}

</script>
