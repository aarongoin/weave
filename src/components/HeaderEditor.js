const
	React = require('preact'),

	DeleteButton = require('./DeleteButton.js'),

	LocationLabel = require('./LocationLabel.js'),

	Bind = require('../bind.js'),
	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Style = {
		box: {
			maxWidth: '50rem',
			backgroundColor: '#fff',
			color: '#222',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-around',
			alignItems: 'stretch',
			width: '14rem',
			position: 'relative',
			top: '0.2rem',
			maxHeight: '13rem',
			margin: '0.2rem',
			border: '0 solid rgba(0,0,0,0)'
		},
		textarea: {
			fontSize: '1.1rem',
			margin: '0.75rem',
			maxHeight: '3.75rem',
			textAlign: 'center'
		},
		deleteButton: {
			zIndex: 25,
			fontSize: '0.9rem',
			position: 'absolute',
			bottom: '-2.5rem',
			left: '5.9rem',
			cursor: 'pointer'
		}
	};


class HeaderEditor extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			selected: false,
			value: props.value
		}

		Bind(this);
	}

	componentWillReceiveProps(props) {
		this.setState({value: props.value, selected: this.state.selected});
	}

	render(props, state) {
		return (
			<div
				style={(state.value.length ? Style.box : Object.assign({}, Style.box, {width: '3rem'}))}
			>
				<ExpandingTextarea
					style={Style.textarea}
					maxLength={250} 
					baseHeight="1.3rem"
					placeholder="..."
					value={state.value}
					onFocus={() => this.setState({ selected: true })}
					onBlur={this.onBlur}
					onInput={(event) => this.setState({value: event.target.value})}
					onChange={this.onChange}
					ref={el => this.el = el}
				/>
				{state.selected ?
					<DeleteButton
						ref={(c) => this.delBtn = c}
						style={(state.value.length ? Style.deleteButton : Object.assign({}, Style.deleteButton, {left: '0.5rem'}))}
						onHold={() => {
							this.setState({selected: false});
							this.context.do('DeleteSlice', { atIndex: props.id });
						}}
					/>
				:
					''
				}
			</div>
		)
	}

	onDragStart() {
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('header', 'header');
		this.el.base.blur();
		if (this.props.onHeaderDrag) this.props.onHeaderDrag(this.props.id);
	}

	onChange(event) {
		this.context.do('ModifySliceHeader', {
			atIndex: this.props.id,
			header: this.state.value
		});
	}

	onBlur(e) {
		setTimeout(() => {
			if (this.delBtn && !this.delBtn.timer) this.setState({selected: false});
		}, 100);
	}

}

module.exports = HeaderEditor;