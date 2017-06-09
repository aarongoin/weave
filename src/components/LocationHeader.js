const
	React = require('preact'),

	DeleteButton = require('./DeleteButton.js'),
	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Bind = require('../bind.js'),
	Style = {
		locationHeader: {
			zIndex: '10',
			width: '7rem',
			color: '#fff',
			backgroundColor: '#777777',
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

class LocationHeader extends React.Component {
	constructor(props, context) {
		super(props, context);
		this.state = {
			value: props.value,
			selected: false
		};

		Bind(this);
	}

	shouldComponentUpdate(props, state) {
		return ((props.value !== this.props.value) ||
				(state.value !== this.state.value) ||
				(state.selected !== this.state.selected));
	}

	componentWillReceiveProps(props) {
		this.setState({value: props.value, selected: false});
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
					onDragStart={(e) => props.onDrag(props.id)}
				>
					<ExpandingTextarea
						type="text"
						style={Style.locationHeader}
						maxLength="24"
						baseHeight="0.9rem"
						value={state.value}
						placeholder="place"
						focus={this.onFocus}
						blur={this.onBlur}
						input={(event) => this.setState({value: event.target.value})}
						change={(event) => this.context.do('MODIFY_LOCATION_NAME', {
							atIndex: this.props.id,
							newName: event.target.value
						})}
					/>
				</div>
				{state.selected ?
					<DeleteButton
						ref={(c) => this.delBtn = c}
						style={Style.deleteButton}
						onHold={() => this.context.do('DELETE_LOCATION', { atIndex: props.id })}
					/>
				:
					''
				}
			</div>
		)
	}

	onFocus(e) {
		this.setState({ selected: true });
	}

	onBlur(e) {
		setTimeout(() => {
			if (!this.delBtn.timer) this.setState({selected: false});
		}, 100);
	}
}

module.exports = LocationHeader;