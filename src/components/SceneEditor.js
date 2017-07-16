const
	React = require('preact'),

	DeleteButton = require('./DeleteButton.js'),

	LocationLabel = require('./LocationLabel.js'),

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
			padding: '0 0.5rem',
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
			fontWeight: 'bold',
			border: 'none',
			outline: 'none',
			cursor: 'pointer'
		},
		deleteButton: {
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
			border: (props.selected ? ('0.2rem solid ' + props.thread.c) : '0 solid rgba(0,0,0,0)'),
			margin: props.selected ? '0' : '0.2rem'
		});

		return (
			<div
				style={argyle}
				onClick={this.onClick}
			>
				<ExpandingTextarea
					style={Style.textarea}
					maxLength={250} 
					onInput={this.onInput} 
					baseHeight="1.3rem"
					placeholder="Scene Summary"
					value={props.scene.h}
					onFocus={this.onFocus}
					ref={el => this.el = el}
				/>
					<span 
						style={Object.assign({}, Style.stats, {backgroundColor: props.thread.c})}
					>
						<LocationLabel
							value={props.scene.l}
							onInput={(value) => this.context.do('ModifySceneLocation', {
								sliceIndex: props.sliceIndex,
								sceneIndex: props.sceneIndex,
								newLocation: value
							})}
						/>
						<button 
							onClick={() => props.onEditScene({ sliceIndex: props.sliceIndex, sceneIndex: props.sceneIndex })} 
							style={Style.button}
						>{props.scene.w > 0 ? 'edit' : 'write'}</button>
				</span>
				{props.selected ?
					<DeleteButton
						ref={(c) => this.delBtn = c}
						style={(Style.deleteButton)}
						onHold={() => {
							this.setState({selected: false});
							this.context.do('DeleteScene', {
								sliceIndex: props.sliceIndex,
								sceneIndex: props.sceneIndex
							});
						}}
					/>
				:
					''
				}
			</div>
		)
	}

	onCreateScene(event) {
		this.newScene(event);
	}

	onFocus(event) {
		if (!this.props.selected) this.select();
	}

	onInput(event) {
		this.context.do('ModifySceneHead', {
			sliceIndex: this.props.sliceIndex,
			sceneIndex: this.props.sceneIndex,
			newHead: event.target.value
		});
	}

	onClick(event) {
		event.stopPropagation();
		if (!this.props.selected) {
			this.select();
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