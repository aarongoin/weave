const
	React = require('preact'),

	Bind = require('../bind.js'),

	DropZone = require('./DropZone.js'),
	SceneEditor = require('./SceneEditor.js'),
	Button = require('../buttons.js'),
	SceneWriter = require('./SceneWriter.js'),

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
			color: '#fff',
			fontWeight: '400',
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
			position: 'absolute',
			backgroundColor: 'inherit',
			width: '18rem',
			height: '1rem',
			padding: '0.75rem 1rem',
			borderBottom: '1px solid #ccc'
		},
		time: {
			outline: 'none',
			border: 'none',
			color: '#fff',
			backgroundColor: 'inherit',
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
				type="scene"
				style={Object.assign({}, Style.location, {backgroundColor: props.location.color, height: Math.max((12.8 * (props.height + 11)), window.innerHeight) + 'px'}, props.style)}
				onDrop={props.onDrop}
			>
				<span
					style={Object.assign({left: '0px', top: props.offset + 'px'}, Style.header)}
				>	
					{state.newScene ?
						<input
							ref={(ref) => this.input = ref}
							style={Style.time}
							type="text"
							maxLength={24}
							placeholder="Date & Time"
							onchange={(e) => {
								this.setState({newScene: false});
								if (ParseTime(e.target.value).isValid)
									context.Do('CreateScene', {location: props.location.id, time: e.target.value});
							}}
							onblur={(e) => {
								this.setState({newScene: false});
							}}
							onkeyup={(e) => e.keyCode === 13 ? e.target.blur() : undefined}
						/>
					: [
						<Button
							img="add"
							color="#fff"
							style={Style.button}
							onclick={() => {
								//props.context.Do('CreateScene', {location: props.location.id})
								this.setState({newScene: true});
							}}
						/>,
						props.location.name
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

	componentDidUpdate() {
		if (this.input && this.state.newScene) this.input.focus();
	}
}

module.exports = Location;