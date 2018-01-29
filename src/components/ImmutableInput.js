const
React = require('preact'),
Bind = require('../bind.js');

class ImmutableInput extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			allowUpdate: true
		}

		Bind(this);
	}

	shouldComponentUpdate() {
		return this.state.allowUpdate;
	}

	render(props, state, context) {
		return (
			<input
				id={props.id}
				style={props.style}
				type="text"
				size={props.size}
				maxLength={props.maxLength}
				placeholder={props.placeholder}
				value={props.value}
				ondblclick={props.ondblclick}
				onclick={props.onclick}
				oninput={props.oninput}
				onchange={this.onChange}
				onfocus={this.onFocus}
				onblur={this.onBlur}
				onkeyup={(e) => e.keyCode === 13 ? e.currentTarget.blur() : undefined}
			/>
		);
	}

	onChange(e) {
		this.setState({allowUpdate: true});
		if (this.props.onchange) this.props.onchange(e);
	}

	onFocus(e) {
		this.setState({allowUpdate: false});
		if (this.props.onfocus) this.props.onfocus(e);
	}

	onBlur(e) {
		this.setState({allowUpdate: true});
		if (this.props.onblur) this.props.onblur(e);
	}
}

module.exports = ImmutableInput;