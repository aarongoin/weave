<style>

	
	#app {
		width: 100vw;		
	}

</style>
<template>

	<div id="app">
		<app-menu title="W"></app-menu>
		<weave-view 
			v-if="view === 0" 
			v-bind:store="store"
			v-bind:edit="editNote"
		></weave-view>
		<thread-view 
			v-else-if="view === 1" 
			v-bind:store="store"
			v-bind:edit="editNote"
		></thread-view>
		<slice-view 
			v-else-if="view === 2" 
			v-bind:store="store"
			v-bind:edit="editNote"
		></slice-view>
		<note-editor 
			v-else-if="view === 3" 
			v-bind:note="note"
			v-bind:canStyle="canStyle"
		></note-editor>
	</div>

</template>
<script>

	const 
		AppMenu = require('./components/AppMenu.vue'),
		WeaveView = require('./components/WeaveView.vue'),
		SliceView = require('./components/SliceView.vue'),
		ThreadView = require('./components/ThreadView.vue'),
		NoteEditor = require('./components/NoteEditor.vue'),
		Store = require('./store.js');

	module.exports = {
		name: 'app',
		components: {
			AppMenu: AppMenu,
			WeaveView: WeaveView,
			SliceView: SliceView,
			ThreadView: ThreadView,
			NoteEditor: NoteEditor
		},
		data: function() { return {
			store: Store,
			view: 3,
			prev: 0,
			note: undefined
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
				this.view = 3;
				// add editor
			},
			restoreView: function() {
				this.note = undefined;
				this.view = this.prev;
				this.prev = undefined;

			},
			canStyle: function(bool) {
				if (bool) {
					// activate editor buttons
				} else {
					// deactivate editor buttons
				}
			}
		}
	}

</script>
