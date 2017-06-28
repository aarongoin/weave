const
	React = require('preact'),

	DeleteButton = require('./DeleteButton.js'),
	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Colors = require('../colors.js'),
	Bind = require('../bind.js'),

	Draggable = require('./Draggable.js'),
	DropZone = require('./DropZone.js'),

	Style = {
		threadHeader: {
			zIndex: '5',
			position: 'relative',
			width: '7rem',
			color: '#fff',
			outline: 'none',
			fontSize: '0.9rem',
			border: 'none',
			textAlign: 'center'
		},
		draggable: {
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			padding: '0.5rem 0 0.5rem 0',
			width: '7rem'
		},
		box: {
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'flex-end',
			height: '14rem',
		},
		deleteButton: {
			zIndex: 25,
			fontSize: '0.9rem',
			position: 'absolute',
			bottom: 0,
			right: '-2.5rem',
			cursor: 'pointer'
		}
	};

class ThreadHeader extends React.Component {
	constructor(props, context) {
		super(props, context);
		this.state = {
			value: props.thread.n,
			selected: false
		};

		Bind(this);
	}

	componentWillReceiveProps(props) {
		this.setState({value: props.thread.n, selected: this.state.selected });
	}

	render(props, state) {
		return (
			<DropZone
				style={Style.box}
				type="thread"
				effect="move"
				onDrop={(from) => {
					if (from > props.id) props.onDrop(from, props.id);
					if (from < props.id - 1) props.onDrop(from, props.id - 1)
				}}
			>
				<Draggable
					style={Object.assign({}, Style.draggable, {backgroundColor: props.thread.c})}
					type="thread"
					effect="move"
					payload={props.id}
					onDrag={props.onDrag}
				>
					<ExpandingTextarea
						ref={(c) => this.input = c}
						type="text"
						style={Object.assign({}, Style.threadHeader, {backgroundColor: 'rgba(0,0,0,0)'})}
						maxLength="24"
						baseHeight="0.9rem"
						value={state.value}
						placeholder="name"
						onFocus={this.onFocus}
						onBlur={this.onBlur}
						onInput={(event) => {
							this.setState({value: event.target.value});
							this.context.do('ModifyThreadName', {
								atIndex: this.props.id,
								newName: event.target.value
							});
						}}
					/>
				</Draggable>
				{state.selected ?
					<DeleteButton
						ref={(c) => this.delBtn = c}
						style={Style.deleteButton}
						onHold={() => {
							this.setState({selected: false});
							this.context.do('DeleteThread', { atIndex: props.id });
						}}
					/>
				:
					''
				}
			</DropZone>
		)
	}

	onDrag(event) {
		clearTimeout(this.timer);
		this.timer = undefined;
		this.input.base.blur();
		this.setState({ selected: false });
		this.props.onDrag(this.props.id);
	}

	colorToggle() {
		this.context.do('ModifyThreadColor', {
			atIndex: this.props.id,
			color: Colors.random(this.props.thread.c)
		})
		this.timer = undefined;
		this.input.base.blur();
	}

	onFocus(e) {
		this.setState({ selected: true });
	}

	onBlur(e) {
		setTimeout(() => {
			if (this.delBtn && !this.delBtn.timer) this.setState({selected: false});
		}, 100);
	}
}

module.exports = ThreadHeader;