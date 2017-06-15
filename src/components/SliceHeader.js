const
	React = require('preact'),

	DeleteButton = require('./DeleteButton.js'),

	Bind = require('../bind.js'),

	Style = {
		sliceHeader: {
			zIndex: '11',
			height: '1.5rem',
			color: '#fff',
			maxWidth: '14rem',
			backgroundColor: '#777777',
			outline: 'none',
			fontSize: '0.9rem',
			margin: '0 auto',
			border: 'none',
			textAlign: 'center',
			padding: '0.25rem'
		},
		slice: {
			position: 'relative',
			display: 'inline-flex',
			justifyContent: 'center',
			alignItems: 'center',
			width: '14rem',
			height: '100%'
		},
		deleteButton: {
			zIndex: 25,
			fontSize: '0.9rem',
			position: 'absolute',
			bottom: '-2.5rem',
			left: '6rem',
			cursor: 'pointer'
		}
	};

function MeasureText(text) {
	return text.length ? (text.length * 1.1) : 5;
}

class SliceHeader extends React.Component {
	constructor(props, context) {
		super(props, context);
		this.state = {
			value: props.value,
			selected: false
		};

		Bind(this);
	}

	componentWillReceiveProps(props) {
		this.setState({value: props.value, selected: this.state.selected});
	}

	render(props, state) {
		return (
			<div style={Style.slice}>
				<div style={{position: 'relative'}}>
					<input
						type="text"
						style={Style.sliceHeader}
						maxLength="24"
						size={MeasureText(state.value)}
						value={state.value}
						placeholder="time"
						onFocus={() => this.setState({ selected: true })}
						onBlur={this.onBlur}
						onInput={(event) => this.setState({value: event.target.value})}
						onChange={this.onChange}
						
					/>
					{state.selected ?
						<DeleteButton
							ref={(c) => this.delBtn = c}
							style={Style.deleteButton}
							onHold={() => this.context.do('DELETE_SLICE', { atIndex: props.id })}
						/>
					:
						''
					}
				</div>
			</div>
		)
	}

	onChange(event) {
		this.context.do('MODIFY_SLICE_DATE', {
			atIndex: this.props.id,
			newDate: event.target.value
		});
	}

	onBlur(e) {
		setTimeout(() => {
			if (this.delBtn && !this.delBtn.timer) this.setState({selected: false});
		}, 100);
	}
}

module.exports = SliceHeader;