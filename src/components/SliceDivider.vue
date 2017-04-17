<style scoped>

	.slice {
		display: block;
	}

	.sliceHeader {
		z-index: 10;
		height: 2rem;
		position: fixed;
		top: 3rem;
		color: #fff;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 3.3rem;
	}

	.space {
		height: 14rem;
		display: flex;
		justify-content: center;
		align-items: flex-end;
	}

	button {
		font-size: 0.9rem;
		color: #fff;
		border: none;
		outline: none;
		cursor: pointer;
		width: 1.3rem;
		height: 1.2rem;
		text-align: center;
		margin: 0 1rem 0.4rem 1rem;
		border-radius: 1rem;
		background-color: rgba(0,0,0,0);
	}
	button:hover {
		background-color: rgba(255,255,255,0.2);
	}

</style>
<template>

	<div class="slice">
		<div class="sliceHeader"></div>
		<div v-for="(t, i) in threads"
			class="space" 
		>
			<button 
				v-on:click="newNote" 
				v-bind:data-thread="i"
			>+</button>
		</div>
	</div>

</template>
<script>

	const
		NoteView = require('./NoteView.vue');

	module.exports = {
		name: 'slice-divider',
		props: ['threads', 'id', 'createNote'],
		methods: {
			newNote: function(event) {
				this.createNote(this.id, Number(event.target.dataset.thread));
			}
		}
	}

</script>