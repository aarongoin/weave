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
		background-color: #222;
		box-shadow: 0 0 1rem #111;

		display: flex;
		justify-content: space-between;
	}

	ul {
		list-style: none;
		display: flex;
		justify-content: space-between;
	}

	li {
		display: inline;
		flex-basis: 3rem;
	}

	li > button {
		font-size: 1.7rem;
		display: inline;
		background-color: #222;
		height: 3rem;
		width: 3rem;
		color: #fff;
		border: none;
		outline: none;
	}

</style>
<template>

	<div id="toolbar">
		<menu type="toolbar">
			<ul v-for="group in buttons">
				<li v-for="b in group">
					<button v-if="b.icon" v-on:click="b.click" v-bind:name="b.name">
						<img v-bind:src="b.icon">
					</button>
					<button v-else v-on:click="b.click" v-bind:name="b.name">
						{{b.text}}
					</button>
				</li>
			</ul>
		</menu>
	</div>

</template>
<script>

	module.exports = {
		name: 'app-menu',
		props: ['buttons'],
		mounted: function() {
			//this.$el.height = this.$el.firstChild.offsetHeight;
		}
	}

</script>