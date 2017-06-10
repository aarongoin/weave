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
			style: Object.assign({}, Style.editBox, { height: props.baseHeight })
		};

		Bind(this);
	}

	render(props, state) {
		var style = Object.assign({}, props.style, state.style);
		return (
			<textarea
				style={style}
				maxlength={props.maxlength}
				placeholder={props.placeholder}
				onInput={this.onInput}
				onChange={props.change}
				onFocus={props.focus}
				onBlur={props.blur}
				value={state.value}
			/>
		)
	}

	shouldComponentUpdate(props, state) {
		return ((props.value !== this.props.value) ||
				(state.value !== this.state.value) ||
				(props.style.backgroundColor !== this.props.style.backgroundColor));
	}

	componentDidMount() {
		this.doResize();
		window.addEventListener('resize', this.doResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.doResize);
	}

	onInput(event) {
		this.state.value = event.target.value;
		if (this.props.input) this.props.input(event);
		this.doResize();
	}

	doResize() {
		this.state.style.height = this.props.baseHeight;
		this.forceUpdate(this.resize);
	}

	resize() {
		this.state.style.height = this.base.scrollHeight + 'px';
		this.forceUpdate();

	}
}

module.exports = ExpandingTextarea;