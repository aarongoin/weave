const
	React = require('preact'),

	DeleteButton = require('./DeleteButton.js'),
	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Colors = require('../colors.js'),
	Bind = require('../bind.js'),
	Style = {
		threadHeader: {
			zIndex: '10',
			width: '7rem',
			color: '#fff',
			outline: 'none',
			fontSize: '0.9rem',
			border: 'none',
			textAlign: 'center',
			paddingTop: '0.5rem'
		},
		draggable: {
			minHeight: '0.9rem'
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
			bottom: '-1.2rem',
			right: '-1.2rem',
			cursor: 'pointer'
		}
	};

class ThreadHeader extends React.Component {
	constructor(props, context) {
		super(props, context);
		this.state = {
			value: props.thread.name,
			selected: false
		};

		Bind(this);
	}

	shouldComponentUpdate(props, state) {
		return ((props.thread.name !== this.props.thread.name) ||
				(props.thread.color !== this.props.thread.color) ||
				(state.value !== this.state.value) ||
				(state.selected !== this.state.selected));
	}

	componentWillReceiveProps(props) {
		this.setState({value: props.thread.name, selected: false});
	}

	render(props, state) {
		return (
			<div
				style={Style.box}
				onDragOver={(e) => e.preventDefault()}
				onDrop={() => props.onDrop(props.id)}
			>
				<div
					style={Style.draggable}
					draggable
					onDragStart={(e) => {
						this.timer = undefined;
						props.onDrag(props.id);
					}}
					onMouseDown={() => (this.timer = setTimeout(this.colorToggle, 1000))}
					onMouseUp={() => (this.timer = undefined)}
				>
					<ExpandingTextarea
						type="text"
						style={Object.assign({}, Style.threadHeader, {backgroundColor: props.thread.color})}
						maxLength="24"
						baseHeight="0.9rem"
						value={state.value}
						placeholder="Name"
						focus={this.onFocus}
						blur={this.onBlur}
						input={(event) => this.setState({value: event.target.value})}
						change={(event) => this.context.do('MODIFY_THREAD_NAME', {
							atIndex: this.props.id,
							newName: event.target.value
						})}
					/>
				</div>
				{state.selected ?
					<DeleteButton
						ref={(c) => this.delBtn = c}
						style={Style.deleteButton}
						onHold={() => this.context.do('DELETE_THREAD', { atIndex: props.id })}
					/>
				:
					''
				}
			</div>
		)
	}

	colorToggle() {
		if (this.timer) {
			this.context.do('MODIFY_THREAD_COLOR', {
				atIndex: this.props.id,
				color: Colors.random(this.props.thread.color)
			})
			this.timer = undefined;
		}
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