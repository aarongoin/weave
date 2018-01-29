const
	React = require('preact'),

	Bind = require('../bind.js'),

	ThreadPaths = require('./ThreadPaths.js'),
	Location = require('./Location.js'),
	DropZone = require('./DropZone.js'),
	SceneEditor = require('./SceneEditor.js'),
	Button = require('../buttons.js'),
	SceneWriter = require('./SceneWriter.js'),

	Style = {
		weave: {
			//position: 'relative',
			display: 'flex',
			overflow: 'scroll',
			flexGrow: 1
		},
		scenes: {
			zIndex: 5,
			position: 'relative',
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'flex-start'
		},
		location: {
			position: 'relative',
			display: 'flex',
			flexGrow: '0',
			flexShrink: '0',
			flexDirection: 'column',
			alignItems: 'center',
			height: 'auto',
			width: '20rem',
			//borderRight: '1px solid #000'
			marginRight: '0.5rem'
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
			padding: '0.5rem 1rem',
			borderBottom: '1px solid #000'
		}

	};

var X_OFFSET = window.scrollX,
	Y_OFFSET = window.scrollY;

class WeaveView extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			offsetX: X_OFFSET,
			offsetY: Y_OFFSET,
			focusedScene: null
		};
		Bind(this);
	}

	componentDidMount() {
		window.document.body.addEventListener('scroll', this.onScroll);
	}

	componentWillUnmount() {
		window.document.body.removeEventListener('scroll', this.onScroll);
	}

	render(props, state, context) {
		var locations = Object.keys(props.map.scenes);
		return (state.focusedScene ? 
			<SceneWriter
				key="scene-writer"
				scene={context.Get(state.focusedScene)}
				dismiss={this.onDismissModal}
			/>
		:
			<div
				key="weave-view"
				data-is="WeaveView"
				style={Object.assign(Style.weave, {justifyContent: 'flex-start'})}
				onclick={props.onDeselect}
			>
				<div style={{display: 'flex', position: 'relative', margin: 'auto'}}>
					{locations.map((loc, i) => (
						<Location
							style={{marginRight: (locations.length - 1) === i ? '0' : '0.5rem'}}
							location={context.Get(loc)}
							scenes={props.map.scenes[loc]}
							times={props.map.times}
							height={props.map.offset}
							onDrop={(id) => context.Do('ModifyScene', {id:id, location: loc})}
							index={i}
							context={context}
							offset={state.offsetY}
							onWriteModal={this.onWriteModal}
						/>
					))}
					<ThreadPaths
						thread={props.thread}
						threads={props.map.threads}
						times={props.map.times}
						width={Object.keys(props.map.scenes).length * 20.5}
						height={props.map.offset}
					/>
				</div>
			</div>
		)
	}

	onDismissModal() {
		this.setState({focusedScene: null}, () => window.document.body.scrollTo(X_OFFSET, Y_OFFSET));
		window.document.body.addEventListener('scroll', this.onScroll);

	}

	onWriteModal(id) {
		window.document.body.removeEventListener('scroll', this.onScroll);
		this.setState({focusedScene: id});
	}

	onScroll(event) {
		X_OFFSET = event.target.scrollLeft;
		Y_OFFSET = event.target.scrollTop;
		this.setState({offsetX: X_OFFSET, offsetY: Y_OFFSET});
	}
}

module.exports = WeaveView;