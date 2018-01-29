const
	React = require('preact'),

	Bind = require('../bind.js'),

	Style = {
		editBox: {
			outline: 'none',
			border: 'none',
			overflow: 'hidden',
			resize: 'none'
		}
	};

class ExpandingTextarea extends React.Component {
	constructor(props, context) {
		super(props, context);
		this.state = {
			value: props.value,
		};

		Bind(this);
	}

	render(props, state) {
		return (
			<textarea
				style={Object.assign({}, Style.editBox, props.style)}
				maxlength={props.maxlength}
				placeholder={props.placeholder}
				onmouseover={props.onmouseover}
				onclick={this.onClick}
				oninput={this.onInput}
				onchange={props.onchange}
				onfocus={this.onFocus}
				onblur={this.onBlur}
				ondragstart={props.ondragstart}
				onkeyup={props.onkeyup}
				value={state.value}
			/>
		)
	}

	shouldComponentUpdate(props, state, context) {
		return this.timer ? false : true;
	}

	componentWillReceiveProps(props) {
		if (props.value !== this.state.value) this.setState({
			value: props.value,
		}, this.doResize);
	}

	componentDidMount() {
		this.doResize();
		window.addEventListener('resize', this.doResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.doResize);
	}

	onClick(event) {
		this.base.focus();
		if (this.props.onclick) this.props.onclick(event);
	}

	onFocus(event) {
		if (this.props.onfocus) this.props.onfocus(event);
	}

	onBlur(event) {
		if (this.props.onblur) this.props.onblur(event);
	}

	onInput(event) {
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(this.onTimer, this.props.buffer || 0, event);
	}

	onTimer(event) {
		this.timer = undefined;

		this.state.value = event.target.value;
		this.doResize();
		this.props.oninput(event);
	}

	doResize() {
		var y = window.document.body.scrollTop,
			x = window.document.body.scrollLeft;
		this.base.style.height = this.props.baseHeight;
		this.base.style.height = this.base.scrollHeight + 'px';
		window.document.body.scrollTo(x, y);
	}
}

module.exports = ExpandingTextarea;