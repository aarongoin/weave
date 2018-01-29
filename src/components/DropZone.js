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
				onMouseEnter={props.onMouseEnter}
				onMouseLeave={props.onMouseLeave}
			>
				{props.children}
			</div>
		);
	}

	onDrop(e) {
		var payload = JSON.parse(e.dataTransfer.getData(this.typeIndex !== undefined ? this.props.type[this.typeIndex] : this.props.type));
		if (this.props.onDrop) this.props.onDrop(payload, e);
	}

	onDragEnter(event) {
		var valid = false;
		this.typeIndex = undefined;
		if (Array.isArray(this.props.type)) {
			for (var i in this.props.type) {
				if (event.dataTransfer.types.includes(this.props.type[i].toLowerCase())) {
					this.typeIndex = i;
					valid = true;
					break;
				}
			}
		} else if (event.dataTransfer.types.includes(this.props.type.toLowerCase())) {
			valid = true;
		}

		if (valid) {
			event.dataTransfer.dropEffect = this.props.effect;
			event.preventDefault();

			if (this.props.onDragEnter) this.props.onDragEnter(event);
		}
	}

	onDragOver(event) {
		var valid = false;
		this.typeIndex = undefined;
		if (Array.isArray(this.props.type)) {
			for (var i in this.props.type) {
				if (event.dataTransfer.types.includes(this.props.type[i].toLowerCase())) {
					this.typeIndex = i;
					valid = true;
					break;
				}
			}
		} else if (event.dataTransfer.types.includes(this.props.type.toLowerCase())) {
			valid = true;
		}

		if (valid) {

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