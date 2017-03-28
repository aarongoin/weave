<template>
	<text-editor></text-editor>
</template>

<script>
const TextEditor = require('./TextEditor.vue');

module.exports = {
	name: 'app-content',
	components: {
		TextEditor: TextEditor
	},
	props: ['store']
}
</script>


<style>
	.editable {
		z-index: 0;
		margin-top: 1rem;
		max-width: 50rem;
		color: #222;
		background-color: #fff;
		border-radius: 2px;
		box-shadow: 0 0 2rem #000;
	}
</style>