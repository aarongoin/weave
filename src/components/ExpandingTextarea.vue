<style>

</style>
<template>

	<textarea 
		:class="'editBox ' + classes" 
		:maxlength="maxLength" 
		:placeholder="placeholder" 
		v-on:input="onInput"
		v-on:change="change"
		v-on:focus="focus"
		v-on:blur="blur"
	></textarea>

</template>
<script>

	const 
		Vue = require('vue');

	module.exports = {
		name: 'expanding-textarea',
		props: ['value', 'baseHeight', 'maxLength', 'input', 'placeholder', 'classes', 'focus', 'change', 'blur'],
		methods: {
			onInput: function(event) {
				if (this.input) this.input(event);
				this.shouldResize(event);
			},
			shouldResize: function() {
				this.$el.style.height = this.baseHeight;
				Vue.nextTick(this.resize);
			},
			resize: function() {
				this.$el.style.height = this.$el.scrollHeight + 'px';
			}
		},
		mounted: function() {
			this.$el.value = (this.value !== undefined) ? this.value : "No default value set...";
			this.shouldResize();
			window.addEventListener('resize', this.shouldResize);
		},
		destroyed: function() {
			window.removeEventListener('resize', this.shouldResize);
		}
	}

</script>