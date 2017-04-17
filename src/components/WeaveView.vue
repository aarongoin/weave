<style scoped>

	.weaveView {
		margin-top: 3rem;
		display: inline-flex;
	}

	.sliceHeader {
		z-index: 10;
		height: 2rem;
		position: fixed;
		top: 3rem;
		background-color: rgba(40,40,40,0.9);
		width: 100%;
	}


	.notes {
		display: inline-flex;
		margin-left: 9rem;
	}

	.notes > div {
		display: inline-flex;
	}

</style>
<template>

	<div class="weaveView">
		<div class="sliceHeader"></div>
		<thread-view 
			:threads="store.threads"
			:width="width + 'px'"
		></thread-view>
		<thread-labels 
			:threads="store.threads"
			:newThread="newThread"
			:scrollX="scrollX"
		></thread-labels>
		<div class="notes">
			<div v-for="(slice, i) in store.slices">

				<slice-divider v-if="i === 0" :id="i" 
					:threads="store.threads" 
					:createNote="createNoteBefore"
				></slice-divider>
				<slice-view 
					:id="i" 
					:slice="slice" 
					:threads="store.threads" 
					:createNote="createNoteAt"
					:editFunc="editFunc"
					:scrollY="scrollY"
				></slice-view>
				<slice-divider 
					:id="(i + 1)" 
					:threads="store.threads" 
					:createNote="createNoteBefore"
				></slice-divider>

			</div>
		</div>
	</div>

</template>
<script>

	const
		Vue = require('vue'),
		SliceView = require('./SliceView.vue'),
		ThreadView = require('./ThreadView.vue'),
		ThreadLabels = require('./ThreadLabels.vue'),
		SliceDivider = require('./SliceDivider.vue');

	module.exports = {
		name: 'weave-view',
		components: {
			SliceView: SliceView,
			ThreadView: ThreadView,
			ThreadLabels: ThreadLabels,
			SliceDivider: SliceDivider
		},
		props: ['store', 'menu', 'editFunc'],
		data: function() { return {
			width: window.innerWidth,
			height: window.innnerHeight,
			scrollX: '0px',
			scrollY: '3rem'
		}},
		methods: {
			createNoteBefore: function(index, thread) {
				// create new slice before slice at index
				this.store.slices.splice(index, 0, {
					datetime: '1999-10-26',
					notes: [{
						id: (new Date()).toJSON(),
						revision: 0,
						thread: thread,
						location: 0,
						head: '',
						wc: 0
					}]
				});
			},
			createNoteAt: function(index, thread) {
				// create new note for thread at slice index
				var notes = this.store.slices[index].notes,
					i = notes.length - 1,
					note = {
						id: (new Date()).toJSON(),
						revision: 0,
						thread: thread,
						location: 0,
						head: '',
						wc: 0
					};

				if (thread > notes[i++].thread) notes.push(note);
				else while (i--) if (thread < notes[i].thread) {
					notes.splice(i, 0, note);
					break;
				}
			},
			newThread: function() {
				// create new thread
				this.store.threads.push({
					color: '#0066ff',
					shade: '#0044dd',
					name: 'Terence Hagarmeyer'
				});
				//
			},
			onScroll: function(event) {
				this.scrollX = this.body.scrollLeft + 'px';
				this.scrollY = (this.toolbar.clientHeight + this.body.scrollTop) + 'px'
			}
		},
		mounted: function() {
			this.menu();

			this.body = document.getElementsByTagName("body")[0];
			this.toolbar = document.getElementById('toolbar');

			this.height = (this.$el.clientHeight < window.innerHeight) ? window.innerHeight : this.$el.clientHeight;
			this.width = (this.$el.clientWidth < window.innerWidth) ? window.innnerWidth : this.$el.clientWidth;

			window.addEventListener('scroll', this.onScroll);
		},
		updated: function() {
			this.height = (this.$el.clientHeight < window.innerHeight) ? window.innerHeight : this.$el.clientHeight;
			this.width = (this.$el.clientWidth < window.innerWidth) ? window.innerWidth : this.$el.clientWidth;
		},
		destroyed: function() {
			window.removeEventListener('scroll', this.onScroll);
		}
	}

</script>