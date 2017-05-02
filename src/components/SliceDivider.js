const
	React = require('preact'),

	Style = {
		slice: {
			display: 'block'
		},

		sliceHeader: {
			zIndex: '10',
			height: '2rem',
			position: 'fixed',
			top: '3rem',
			color: '#fff',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			width: '3.3rem'
		},

		space: {
			height: '14rem',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'flex-end'
		},

		button: {
			fontSize: '0.9rem',
			color: '#fff',
			border: 'none',
			outline: 'none',
			cursor: 'pointer',
			width: '1.3rem',
			height: '1.2rem',
			textAlign: 'center',
			margin: '0 1rem 0.4rem 1rem',
			borderRadius: '1rem',
			backgroundColor: 'rgba(0,0,0,0)'
		}
	};

class SliceDivider extends React.Component {

	render(props, state) {
		return (
			<div style={Style.slice}>
				<div style={Style.sliceHeader}>&nbsp;</div>
				{this.renderSpaces()}
			</div>
		)
	}

	newNote(event) {
		this.props.createNote(this.props.id, Number(event.target.dataset.thread));
	}

	renderSpaces() {
		var rendered = [],
			i = -1;

		while (++i < this.props.threads.length) {
			rendered.push(
				<div style={Style.space}>
					<button 
						style={Style.button}
						onclick={this.props.newNote}
						onmouseenter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
						onmouseleave={e => e.target.style.backgroundColor = 'rgba(0,0,0,0)'}
						data-thread={i}
					>+</button>
				</div>
			);
		}

		return rendered;
	}
}

module.exports = SliceDivider;