const
	React = require('preact'),

	Button = require('../buttons.js'),
	Draggable = require('./Draggable.js'),

	Bind = require('../bind.js'),
	ExpandingTextarea = require('./ExpandingTextarea.js'),
	DropZone = require('./DropZone.js'),
	DateTimeInput = require('./DateTimeInput.js'),

	// used for the DragImage when dragging Pins
	PIN = document.getElementById('pin'),

	Style = {
		box: {
			padding: '0.5rem 1rem',
			color: '#222',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-around',
			alignItems: 'stretch',
			width: '16rem',
			position: 'relative',
			marginTop: '0.5rem',
			border: '1px solid rgba(0,0,0,0.5)',
			borderLeft: 'none',
			borderRight: 'none',
			boxShadow: '0 0.15rem 0.15rem rgba(0,0,0,0.5)',
			borderRadius: "0.15rem"
		},

		sceneHead: {
			fontSize: '1.1rem',
			height: '1.3rem',
			margin: '0.25rem 0.75rem'
		},

		stats: {
			flexShrink: 0,
			color: '#000',
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
			fontSize: '0.9rem',
			height: '1.25rem',
			marginBottom: '0.25rem'
		},

		wordcount: {
			fontSize: '0.9rem',
			padding: '0.5rem'
		},
		btn: {
			cursor: 'pointer',
			width: '1rem',
			height: '1rem'
		},
		textarea: {
			fontSize: '1.1rem',
			maxHeight: '9rem',
			backgroundColor: 'inherit'
		},
		
		time: {
			outline: 'none',
			border: 'none',
			backgroundColor: 'inherit',
			width: '10rem',
			textAlign: "center"
		},
		threads: {
			flexShrink: 0,
			height: '0.1rem',
		},
		tooltip: {
			zIndex: 100,
			position: 'absolute',
			padding: "0.25rem 0.5rem",
			borderRadius: "0.5rem",
			top: '-0.25rem',
			left: '1rem',
			color: '#fff',
			whiteSpace: 'nowrap',
			fontSize: '0.8rem'
		},
	};


class SceneEditor extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			hover: false,
			focus: false,
		};

		Bind(this);
	}

	render(props, state, context) {
		return (
			<DropZone
				key={props.scene.id}
				style={props.style}
				type={["Thread", "Pin"]}
				effect="move"
				onDrop={(payload, e) => {
					context.Do('ThreadScene', {scene: props.scene.id, thread: payload.id});
					e.stopPropagation();
				}}
			>
				<Draggable
					key={props.scene.id}
					type="scene"
					effect="move"
					payload={props.scene.id}
					style={Object.assign({zIndex: state.focus ? 100 : 5, maxHeight: state.focus ? '14rem' : '4.5rem', backgroundColor: state.focus ? '#fff' : '#eee'}, Style.box)}
					onMouseEnter={(e) => this.setState({hover: true})}
					onMouseLeave={(e) => this.setState({hover: false})}
				>
					<div style={Style.threads}>
						{Object.keys(props.scene.thread).map((id, index) => {
							var thread = context.Get(id);
							return (
								<Draggable
									type="Pin"
									effect="move"
									payload={{id}}
									style={{
										position: 'absolute',
										left: (index * 1.5 + 1) + 'rem',
										top: '-0.4rem',
										borderRadius: '0.5rem',
										width: '1rem',
										height: '1rem',
										backgroundColor: thread.color,
										overflow: 'visible'
									}}
									class="tooltip"
									onDragStart={(e) => {
										PIN.style.backgroundColor = thread.color;
										e.dataTransfer.setDragImage(PIN, 7, 8);
									}}
									onDragEnd={(e) => {
										if (e.dataTransfer.dropEffect === 'none') context.Do('UnthreadScene', {scene: props.scene.id, thread: id});
									}}
								>
									&nbsp;
									<span
										class="tooltipText"
										style={Object.assign({backgroundColor: thread.color}, Style.tooltip)}
									>
										{thread.name}
									</span>
								</Draggable>
							);
						})}
					</div>
					<div style={{display: "flex"}}>
						<div style={{flexGrow: "1", overflow: "hidden"}}>
							<span 
								style={Object.assign({}, Style.stats, {justifyContent: "center"})}
							>
								<DateTimeInput
									location={props.scene.location}
									scene={props.scene.id}
									style={Style.time}
									type="text"
									maxLength={24}
									placeholder="Date & Time"
									value={props.scene.time}
									onchange={(e) => context.Do('ModifyScene', {id: props.scene.id, time: e.target.value})}
									onfocus={() => this.setState({focus: true})}
									onblur={() => this.setState({focus: false})}
								/>						
							</span>
							<ExpandingTextarea
								ref={(e) => {
									if (e && props.scene.id === context.focus) {
										e.base.focus();
										context.eatFocus();
										context.focus = undefined;
									}
								}}
								style={Style.textarea}
								maxLength={250} 
								oninput={this.onInput} 
								baseHeight="1.3rem"
								placeholder="Summary"
								value={props.scene.summary}
								onfocus={() => {
									this.setState({focus: true});
								}}
								onblur={() => {
									this.setState({focus: false});
								}}
								ondragstart={this.preventDrag}
							/>
						</div>
						<div style={{ marginTop: "0.25rem", width: "1rem", height: "2.75rem", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
							{state.hover ? [
								<Button
									img="delete"
									color="#000"
									hoverColor="#c30"
									style={Style.btn}
									onclick={(e) => {
										if (this.timer) {
											clearTimeout(this.timer);
											this.timer = undefined;
										}
									}}
									onmousedown={(e) => {
										this.timer = setTimeout(context.Do, 1000, 'DeleteScene', props.scene.id);
									}}
								/>,
								<Button
									img="document"
									color="#000"
									hoverColor="#093"
									style={Style.btn}
									onclick={() => props.onWriteModal(props.scene.id)}
								/>
							] : ""}
						</div>
					</div>
				</Draggable>
			</DropZone>
		)
	}

	onInput(event) {
		this.context.Do('ModifyScene', {
			id: this.props.scene.id,
			summary: event.target.value
		});
	}

	preventDrag(e) {
		e.preventDefault();
	}
}

module.exports = SceneEditor;