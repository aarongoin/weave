<template>
	<div id="app">
		<app-menu title="weave"></app-menu>
		<app-content store=Store></app-content>
	</div>
</template>

<script>
const AppMenu = require('./components/AppMenu.vue');
const AppContent = require('./components/AppContent.vue');
const Store = require('./store.js');

module.exports = {
	name: 'app',
	components: {
		AppMenu: AppMenu,
		AppContent: AppContent
	},
	data: function() { return {
		Store: Store
	}}
}
</script>

<style>
	* {
		padding: 0;
		margin: 0 auto;
		font-family: "Verdana", "Arial", sans-serif;
	}
	#app {
		width: 100vw;
		height: 100vh;
		background-color: #333;
	}

	body {
		font-size: 1.1em;
	}
</style>
