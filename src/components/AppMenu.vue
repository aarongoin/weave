<style scoped>

	#toolbar {
		width: 100%;
		height: 3rem;
		background-color: #000;
		color: #fff;
	}

	#toolbar > menu {
		z-index: 1;
		position: fixed !important;
		width: 100vw;
		height: 3rem;
		display: inline;
		background-color: #06c;
		padding-left: 1rem;
		padding-right: 1rem;
		box-shadow: 0 0 1rem #111;
	}

	#toolbar li, #toolbar h1 {
		display: inline;
	}

</style>
<template>

	<div id="toolbar">
		<menu type="toolbar">
			<li><h1>{{title}}</h1></li>
			<li>search</li>
			<li>undo</li>
			<li>redo</li>
			<li>new</li>
			<li>weaveView</li>
			<li>threadView</li>
			<li>sliceView</li>
		</menu>
	</div>

</template>
<script>

	module.exports = {
		name: 'app-menu',
		props: ['title'],
		mounted: function() {
			//this.$el.height = this.$el.firstChild.offsetHeight;
		}
	}

</script>