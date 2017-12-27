const
	React = require('preact'),

	Bind = require('../bind.js'),
	BufferedText = require('./BufferedText.js'),

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
			<BufferedText onInput={props.onInput}>
			<textarea
				draggable
				style={Object.assign({}, Style.editBox, props.style)}
				ref={(el) => this.el = el}
				maxlength={props.maxlength}
				placeholder={props.placeholder}
				onInput={this.onInput}
				onChange={props.onChange}
				onFocus={props.onFocus}
				onBlur={props.onBlur}
				onDragStart={props.onDragStart}
				value={state.value}
			/>
			</BufferedText>
		)
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
		this.state.value = event.target.value;
		this.doResize();
	}

	doResize() {
		this.el.style.height = this.props.baseHeight;
		this.el.style.height = this.el.scrollHeight + 'px';
	}
}

module.exports = ExpandingTextarea;