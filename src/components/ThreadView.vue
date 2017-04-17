<style scoped>

	.outer {
		margin-top: 3rem;
		z-index: -5;
		position: absolute;
		left: 0;
		top: 0;
		opacity: 0.3;
	}

	.outer > div {
		margin-top: 12rem;
		height: 2rem;
	}

</style>
<template>

	<div
		class="outer"
		:style="{ width: width }"
	>
		<div v-for="thread in threads"
			:style="{ backgroundColor:thread.color }"
		>&nbsp;</div>
	</div>

</template>
<script>

	module.exports = {
		name: 'thread-view',
		props: ['threads', 'width']
	}

</script>