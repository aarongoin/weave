const
	React = require('preact'),

	Bind = require('../bind.js');

class DropZone extends React.Component {
	constructor(props, context) {
		super(props, context);

		Bind(this);
	}

	render(props, state) {
		return (
			<div
				style={props.style}
				onDragEnter={this.onDragEnter}
				onDragOver={this.onDragOver}
				onDragLeave={this.onDragLeave}
				onDrop={this.onDrop}
			>
				{props.children}
			</div>
		);
	}

	onDrop(event) {
		var payload = JSON.parse(event.dataTransfer.getData(this.props.type));
		if (this.props.onDrop) this.props.onDrop(payload, event);
	}

	onDragEnter(event) {
		if (event.dataTransfer.types[0] === this.props.type) {

			event.dataTransfer.dropEffect = this.props.effect;
			event.preventDefault();

			if (this.props.onDragEnter) this.props.onDragEnter(event);
		}
	}

	onDragOver(event) {
		if (event.dataTransfer.types[0] === this.props.type) {

			event.dataTransfer.dropEffect = this.props.effect;
			event.preventDefault();

			if (this.props.onDragOver) this.props.onDragOver(event);
		}
	}

	onDragLeave(event) {
		if (this.props.onDragLeave) this.props.onDragLeave(event);
	}
}

module.exports = DropZone;