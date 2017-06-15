const
	React = require('preact'),

	Bind = require('../bind.js');

class Draggable extends React.Component {
	constructor(props, context) {
		super(props, context);

		Bind(this);
	}

	render(props, state) {
		return (
			<div
				style={props.style}
				draggable
				onDrag={this.onDrag}
				onDragStart={this.onDragStart}
				onDragEnd={this.onDragEnd}
				onDragExit={this.onDragExit}
				onMouseDown={this.onMouseDown}
				onMouseUp={this.onMouseUp}
			>
				{props.children}
			</div>
		);
	}

	onDrag(event) {
		if (this.props.onDrag) this.props.onDrag(event);
	}

	onDragStart(event) {
		var payload = JSON.stringify(this.props.payload || 'payload');

		event.dataTransfer.effectAllowed = this.props.effect;
		event.dataTransfer.setData(this.props.type, payload);

		if (this.props.onDragStart) this.props.onDragStart(event);
	}

	onDragEnd(event) {
		if (this.props.onDragEnd) this.props.onDragEnd(event);
	}

	onDragExit(event) {
		if (this.props.onDragExit) this.props.onDragExit(event);
	}

	onMouseDown(event) {
		if (this.props.onMouseDown) this.props.onMouseDown(event);
	}

	onMouseUp(event) {
		if (this.props.onMouseUp) this.props.onMouseUp(event);
	}
}

module.exports = Draggable;