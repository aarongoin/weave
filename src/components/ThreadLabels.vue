<style scoped>

	.labels {
		z-index: 5;
		display: block;
		margin-top: 3rem;
		width: 7rem;
		position: absolute;
		top: 0;
		left: 0;
		background-color: rgba(40,40,40,0.9);
	}

	.space {
		height: 14rem;
		display: flex;
		justify-content: center;
		align-items: flex-end;
	}

	.newThread {
		min-height: 2rem;
		height: 2rem;
		font-size: 0.9rem;
		color: #fff;
		border: none;
		outline: none;
		cursor: pointer;
		width: 100%;
		background-color: rgba(0,0,0,0);
		text-align: center;
		padding: 0 0.5rem;
	}
	.newThread:hover {
		background-color: rgba(255,255,255,0.2);
	}

	.threadBtn {
		min-height: 2rem;
		font-size: 0.8rem;
		color: #fff;
		border: none;
		outline: none;
		cursor: pointer;
		text-align: center;
		padding: 0.5rem 0.5rem;
		width: 100%;
	}

</style>
<template>

		<div class="labels"
			:style="{ left: scrollX, height: height + 'px' }"
		>
			<div v-for="(t, i) in threads"
				class="space" 
			>
				<button 
					v-on:click="modal" 
					:data-thread="i"
					class="threadBtn"
					:style="{ backgroundColor: t.color }"
				>{{t.name}}</button>
			</div>
			<div class="space">
				<button v-on:click="newThread" class="newThread">+</button>
			</div>
		</div>
</template>
<script>

	module.exports = {
		name: 'thread-view',
		props: ['threads', 'newThread', 'scrollX'],
		data: function() {return {
			height: window.innerHeight
		}},
		updated: function() {
			var e, h;

			if (this.$el){
				e = this.$el.lastElementChild;
				h = e.offsetHeight + e.offsetTop;
			}
			this.height = (e && h > window.innerHeight) ? h : window.innerHeight;
		}
	}

</script>