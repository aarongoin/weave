<style scoped>

	#toolbar {
		z-index: 1;
		position: fixed !important;
		top: 0;
		left: 0;
		right: 0;
		box-shadow: 0 0 0.5rem #111;
		width: 100%;
		height: 3rem;
		background-color: #222;
		color: #fff;
	}

	#toolbar > menu {
		
		width: 100%;
		max-width: 50rem;
		height: 3rem;
		margin-left: auto;
		margin-right: auto;
		display: flex;
		justify-content: space-around;
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
		font-size: 1.5rem;
		display: inline;
		background-color: #222;
		color: #fff;
		border: none;
		outline: none;
		height: 3rem;
		padding: 0.75rem;
		cursor: pointer;
	}

	img {
		width: 1.5rem;
		height: 1.5rem;
	}

	li span {
		position: relative;
		bottom: 0.1rem;
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
						<span>{{b.text}}</span>
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