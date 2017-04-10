<style scoped>

	span {
		display: inline-block;
		margin: 0 1.5rem 0.5rem auto;
		vertical-align: center;
	}

	input {
		border: none;
		outline: none;
		width: 1.8rem;
		font-size: 1.1rem;
		text-align: center;
	}

	input:first-child {
		width: 3rem;
	}

	.invalid {
		background-color: #f00;
	}

</style>
<template>

	<span>
		<input v-on:input="onInput" @keyup="onKeyup" v-bind:class="valid" type="text" min="1" max="9999" step="1" placeholder="YYYY"/>/
		<input v-on:input="onInput" @keyup="onKeyup" v-bind:class="valid" type="text" min="1" max="12" step="1" placeholder="MM"/>/
		<input v-on:input="onInput" @keyup="onKeyup" v-bind:class="valid" type="text" min="1" max="31" step="1" placeholder="DD"/>
		<input v-on:input="onInput" @keyup="onKeyup" v-bind:class="valid" type="text" min="0" max="24" step="1" placeholder="HH"/>:
		<input v-on:input="onInput" @keyup="onKeyup" v-bind:class="valid" type="text" min="0" max="59" step="1" placeholder="MM"/>
	</span>

</template>
<script>

const
	checkDateTime = require('../store.js').checkDateTime;

module.exports = {
	name: 'date-time',
	data: function() { return {
		valid: ""
	}},
	props: ['initial', 'thread'],
	methods: {
		validate: function() {
			var v = "",
				i = -1;

			while (++i < 4) v += this.$el.children[i].value + '-';
			v += this.$el.children[i].value;

			this.valid = (checkDateTime(v)) ? "" : "invalid";
		},
		onInput: function(event) {
			var t = event.target,
				v = t.value;

			if (v === "") return;
			else v = Number(v);

			if (v !== v >> 0) t.value = v >> 0;

			if (v > Number(t.max)) v = t.max;
			else if ( v < Number(t.min)) v = t.min;

			v = String(v);

			switch (t.placeholder) {
				case "YYYY":
					if (v.length === 4) this.$el.children[1].focus();
					break;
				case "MM":
					if (v.length === 2) this.$el.children[2].focus();
					break;
				case "DD":
					if (v.length === 2) this.$el.children[3].focus();
					break;
				case "HH":
					if (v.length === 2) this.$el.children[4].focus();
					break;
			}

			t.value = v;

		},
		onKeyup: function(event) {
			var t = event.target;

			if (event.key === 'ArrowLeft') {
				if ((t.selectionStart === 0) && t.previousElementSibling) {
					t.previousElementSibling.focus();
					t.previousElementSibling.selectionStart = t.previousElementSibling.value.length
				}
			}
			else if (event.key === 'ArrowRight') {
				if ((t.selectionStart === t.value.length) && t.nextElementSibling) {
					t.nextElementSibling.focus();
				}
			}
		},
		mounted: function() {
			var l = this.initial.split('-'),
				i = l.length;
			while (i--) this.$el.children[i].value = i[i] || "";
		}
	}
}

</script>