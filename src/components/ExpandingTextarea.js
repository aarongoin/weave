const
	React = require('preact'),

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
		super(props);
		this.state = {
			style: Object.assign(Style.editBox, { height: props.baseHeight })
		};

		this.onInput = this.onInput.bind(this);
		this.doResize = this.doResize.bind(this);
	}

	render(props, state) {
		return (
			<textarea
				style={Object.assign(props.style, state.style)}
				maxlength={props.maxlength}
				placeholder={props.placeholder}
				oninput={this.onInput}
				onchange={props.change}
				onfocus={props.focus}
				onblur={props.blur}
				ref={(el) => {
					if (this.state.style.height !== el.scrollHeight) this.setState({style: Object.assign(Style.editBox, { height: el.scrollHeight })})
				}}
			/>
		)
	}

	componentDidMount() {
		this.base.value = (this.props.value !== undefined) ? this.props.value : "No default value set...";
		this.doResize();
		window.addEventListener('resize', this.doResize);
	}

	componentDidUnmount() {
		window.removeEventListener('resize', this.doResize);
	}

	onInput(event) {
		if (this.props.oninput) this.props.oninput(event);
		this.doResize();
	}

	doResize() {
		this.state.style.height = this.props.baseHeight;
		this.forceUpdate();
	}

	resize() {
		//this.state.style.height = this.el.scrollHeight + 'px';
		//this.forceUpdate();
	}
}

module.exports = ExpandingTextarea;