const
	React = require('preact'),

	Bind = require('../bind.js'),

	DropZone = require('./DropZone.js'),
	SceneEditor = require('./SceneEditor.js'),
	Button = require('../buttons.js'),
	SceneWriter = require('./SceneWriter.js'),
	DateTimeInput = require('./DateTimeInput.js'),

	ParseTime = require('../time.js'),

	Style = {
		location: {
			//zIndex: 0,
			position: 'relative',
			display: 'flex',
			flexGrow: '0',
			flexShrink: '0',
			flexDirection: 'column',
			alignItems: 'center',
			height: 'auto',
			width: '20rem',
			//border: '0.5rem solid #000',
			marginRight: '0.5rem',
			transition: 'width 0.5s ease-in'
		},
		header: {
			zIndex: 20,
			color: '#eee',
			fontWeight: '100',
			display: 'flex',
			fontSize: "1.25rem",
			justifyContent: 'space-between',
			alignItems: 'center',
			position: 'absolute',
			backgroundColor: 'inherit',
			width: '18rem',
			minheight: '1.5rem',
			padding: '0.5rem 1rem',
			//borderBottom: '1px solid #ccc'
		},
		time: {
			outline: 'none',
			border: 'none',
			color: '#000',
			backgroundColor: '#fff',
			padding: "0.25rem 0.5rem",
			borderRadius: "0.25rem",
			fontSize: "0.9rem"
			//width: '5rem'
		},

	};

class Location extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			newScene: false
		}

		Bind(this);
	}

	render(props, state, context) {
		return (
			<DropZone
				key={props.location.id}
				type="scene"
				style={Object.assign({}, Style.location, {backgroundColor: props.location.color, height: Math.max((12.8 * (props.height + 11)), window.innerHeight) + 'px'}, props.style)}
				onDrop={props.onDrop}
			>
				<span
					style={Object.assign({left: '0px', top: props.offset + 'px', display: "flex", justifyContent: "space-between"}, Style.header)}
				>	
					{state.newScene ?
						<DateTimeInput
							ref={(e) => {
								if (e && ("loc" + props.location.id) === context.focus) {
									e.base.children[0].focus();
									context.eatFocus();
								}
							}}
							location={props.location.id}
							style={Style.time}
							onchange={(e) => {
								this.setState({newScene: false});
								context.Do('CreateScene', {location: props.location.id, time: e.target.value});
							}}
							onblur={(e) => {
								this.setState({newScene: false});
							}}
						/>
					: [
						<Button
							img="add"
							color="#fff"
							style={Style.button}
							onclick={() => {
								//props.context.Do('CreateScene', {location: props.location.id})
								context.focusOn("loc" + props.location.id);
								this.setState({newScene: true});
							}}
						/>,
						<span style={{maxWidth: "15rem", textAlign: "right"}}>{props.location.name}</span>
					]}
				</span>
				{props.scenes.map((scene, i) => (
					<SceneEditor
						style={{
							position: 'absolute',
							top: props.times[scene.utctime] + 'rem'
						}}
						scene={scene}
						onWriteModal={props.onWriteModal}
					/>
				))}
			</DropZone>
		)
	}
}

module.exports = Location;