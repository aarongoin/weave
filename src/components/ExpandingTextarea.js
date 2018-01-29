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
				draggable
				style={Object.assign({}, Style.editBox, props.style)}
				ref={(el) => this.el = el}
				maxlength={props.maxlength}
				placeholder={props.placeholder}
				onmouseover={props.onmouseover}
				oninput={this.onInput}
				onchange={props.onchange}
				onfocus={props.onfocus}
				onblur={props.onblur}
				ondragstart={props.ondragstart}
				onkeyup={props.onkeyup}
				value={props.value}
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
		this.el.style.height = this.props.baseHeight;
		this.el.style.height = this.el.scrollHeight + 'px';
		window.document.body.scrollTo(x, y);
	}
}

module.exports = ExpandingTextarea;