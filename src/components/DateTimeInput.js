const
React = require('preact'),
Bind = require('../bind.js'),

ParseTime = require('../time.js'),

ImmutableInput = require('./ImmutableInput.js');

class DateTimeInput extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			invalidText: ""
		}

		Bind(this);
	}

	componentWillUpdate() {
		this.validate(this.props.value);
	}

	render(props, state, context) {
		return (
			<span style={Object.assign({}, props.style, {color: state.invalidText.length ? "#fa8072" : props.style.color || "inherit"})}>
				<ImmutableInput
					style={{outline: 'none', border: 'none', backgroundColor: "inherit"}}
					type="text"
					maxLength="24"
					placeholder="Date & Time"
					value={props.value}
					oninput={this.onInput}
					onchange={this.onChange}
					onfocus={props.onfocus}
					onblur={props.onblur}
				/>
				{state.invalidText}
			</span>
		);
	}

	validate(text) {
		// validate date/time
		var parsed = ParseTime(text),
			message = "";
		if (!parsed.isValid) message = "Invalid Date!";
		else if (this.context.doesTimeConflict(this.props.location, parsed.ISOString, this.props.scene || "")) message = "Date Conflict!";
		this.setState({invalidText: message});
	}

	onInput(e) {
		this.validate(e.target.value)
	}

	onChange(e) {
		if (this.state.invalidText.length === 0) {
			this.props.onchange(e);
		}
	}
}

module.exports = DateTimeInput;