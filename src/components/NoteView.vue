<style scoped>

	div {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		align-items: stretch;
		width: 14rem;
		position: relative;
		top: 0.2rem;
	}

	.noteHead {
		font-size: 1.1rem;
		height: 1.3rem;
		margin: 0.25rem 0.75rem;
	}

	.stats {
		color: #fff;
		margin: 0;
		display: flex;
		justify-content: space-around;
		align-items: center;
		padding: 0.5rem 0.75rem 0.5rem 0.75rem;
	}

	div > span {
		margin: 0.25rem 0;
		font-size: 0.9rem;
	}

	textarea {
		font-size: 1.1rem;
		margin: 0.75rem;
	}

	button {
		font-size: 0.9rem;
		color: #fff;
		border: none;
		outline: none;
		cursor: pointer;
	}

	button:hover {
		text-decoration: underline;
	}

</style>
<template>

	<div class="box"
		:style="{
			border: (focused) ? '0.2rem solid ' + thread.color : ' 0 solid rgba(0,0,0,0)',
			margin: (focused) ? '0rem' : '0.2rem',
			zIndex: (focused) ? '3' : (odd) ? '1' : '2'
		}"
		v-on:click="onClick"
	>
		<expanding-textarea 
			maxLength="250" 
			classes=""
			:input="onInput" 
			baseHeight="1.3rem"
			placeholder="Title/Summary"
			:value="note.head"
			:focus="onFocus"
			:change="onChange"
			:blur="onBlur"
		></expanding-textarea>
		<span 
			class="stats" 
			:style="'background-color:' + thread.color"
		>
			<button 
				v-on:click="onEdit" 
				:style="'background-color:' + thread.color"
			>edit</button>
			<span class="wordcount">{{note.wc}} words</span>
		</span>
	</div>

</template>
<script>

	const 
		Vue = require('vue'),
		DateTime = require('./DateTime.vue'),
		ExpandingTextarea = require('./ExpandingTextarea.vue');

	module.exports = {
		name: 'note-view',
		props: ['note', 'editFunc', 'thread', 'odd', 'newNote'],
		data: function() { return {
			focused: false
		}},
		components: {
			DateTime: DateTime,
			ExpandingTextarea: ExpandingTextarea
		},
		methods: {
			onInput: function(event) {
				this.note.head = event.target.value;
			},
			onEdit: function() {
				this.editFunc(this.note);
			},
			onCreateNote: function(event) {
				this.newNote(event);
			},
			onFocus: function() {
				this.focused = true;
			},
			onChange: function() {
				this.focused = false;
			},
			onBlur: function() {
				this.focused = false;
			},
			onClick: function(event) {
				this.$el.firstElementChild.focus();
			}
		}
	}

</script>