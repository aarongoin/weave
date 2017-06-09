const
	React = require('preact'),

	DeleteButton = require('./DeleteButton.js'),

	nextColor = require('../colors.js'),

	ThreadLabel = require('./ThreadLabel.js'),

	Bind = require('../bind.js'),
	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Style = {
		box: {
			maxWidth: '50rem',
			backgroundColor: '#fff',
			color: '#222',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-around',
			alignItems: 'stretch',
			width: '14rem',
			position: 'relative',
			top: '0.2rem',
			maxHeight: '13rem'
		},

		sceneHead: {
			fontSize: '1.1rem',
			height: '1.3rem',
			margin: '0.25rem 0.75rem'
		},

		stats: {
			color: '#fff',
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
			fontSize: '0.9rem',
			height: '2rem'
		},

		wordcount: {
			fontSize: '0.9rem',
			padding: '0.5rem'
		},

		textarea: {
			fontSize: '1.1rem',
			margin: '0.75rem',
			maxHeight: '9rem'
		},

		button: {
			fontSize: '0.9rem',
			padding: '0.5rem',
			color: '#fff',
			backgroundColor: 'rgba(0,0,0,0)',
			border: 'none',
			outline: 'none',
			cursor: 'pointer'
		},
		colorButton: {
			width: '1rem',
			height: '1rem',
			border: 'thin solid #fff',
			borderRadius: '1rem',
			color: '#fff',
			backgroundColor: 'rgba(0,0,0,0)',
			outline: 'none',
			cursor: 'pointer'
		},
		moveButton: {
			zIndex: 25,
			fontSize: '0.9rem',
			position: 'absolute',
			padding: '0.5rem',
			bottom: '-2.5rem',
			left: '3rem',
			border: 'none',
			color: '#fff',
			backgroundColor: '#000',
			outline: 'none',
			cursor: 'pointer'
		},
		deleteButton: {
			zIndex: 25,
			fontSize: '0.9rem',
			position: 'absolute',
			bottom: '-1.4rem',
			right: '-1.4rem',
			cursor: 'pointer'
		}
	};


class SceneEditor extends React.Component {
	constructor(props, context) {
		super(props, context);

		Bind(this);
	}

	render(props, state) {
		var argyle = Object.assign({}, Style.box, {
			border: (props.selected ? ('0.2rem solid ' + props.thread.color) : '0 solid rgba(0,0,0,0)'),
			margin: props.selected ? '0' : '0.2rem'
		});

		return (
			<div
				style={argyle}
				onClick={this.onClick}
				draggable
				onDragStart={() => props.onDrag({sliceIndex: props.sliceIndex, sceneIndex: props.sceneIndex})}
			>
				<ExpandingTextarea
					style={Style.textarea}
					maxLength={250} 
					oninput={this.onInput} 
					baseHeight="1.3rem"
					placeholder="Title/Summary"
					value={props.scene.head}
					focus={this.onFocus}
					change={this.onChange}
					ref={el => this.el = el}
				/>
					<span 
						style={Object.assign({}, Style.stats, {backgroundColor: props.thread.color})}
					>
						{!props.selected ? [
							<button 
								onclick={() => props.onEdit({sliceIndex: props.sliceIndex, sceneIndex: props.sceneIndex})} 
								style={Style.button}
							>edit</button>,
							<span style={Style.wordcount}>{props.scene.wc} words</span>
						] : [
							<button
								style={Style.colorButton}
								onClick={() => this.context.do('MODIFY_NOTE_THREAD', {
									sliceIndex: props.sliceIndex,
									sceneIndex: props.sceneIndex
								})}
							></button>,
							<ThreadLabel
								value={props.thread.name}
								onChange={(e) => this.context.do('MODIFY_THREAD_NAME', {
									atIndex: props.scene.thread,
									newName: e.target.value
								})}
							/>,
							/*<button
								style={Style.moveButton}
								onClick={props.moveNote}
							>move</button>,*/
							<DeleteButton
								style={Style.deleteButton}
								onHold={() => this.context.do('DELETE_NOTE', {
									sliceIndex: props.sliceIndex,
									sceneIndex: props.sceneIndex
								})}
							/>							
						]}
				</span>
			</div>
		)
	}

	onCreateNote(event) {
		this.newNote(event);
	}

	onFocus(event) {
		if (!this.props.selected) this.select();
	}

	onChange(event) {
		this.context.do('MODIFY_NOTE_HEAD', {
			sliceIndex: this.props.sliceIndex,
			sceneIndex: this.props.sceneIndex,
			newHead: event.target.value
		});
	}

	onClick(event) {
		event.stopPropagation();
		if (!this.props.selected) {
			this.select();
			this.el.base.focus();
		}
	}

	select() {
		this.props.onSelect({
			sliceIndex: this.props.sliceIndex,
			sceneIndex: this.props.sceneIndex
		});
	}
}

module.exports = SceneEditor;