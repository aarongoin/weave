const
	React = require('preact'),

	Store = require('../store.js'),

	SliceView = require('./SliceView.js'),
	ThreadView = require('./ThreadView.js'),
	ThreadLabels = require('./ThreadLabels.js'),
	SliceDivider = require('./SliceDivider.js'),

	Style = {
		weave: {
			marginTop: '3rem',
			marginLeft: '7rem',
			display: 'inline-flex'
		},
		header: {
			zIndex: '10',

			position: 'fixed',
			top: '3rem',

			height: '1.8rem',
			width: '100%',

			backgroundColor: 'rgba(40,40,40,0.9)'
		},
		notes: {
			display: 'inline-flex',
			marginLeft: '7rem'
		},
		slice: {
			display: 'inline-flex'
		}
	};
 

class WeaveView extends React.Component {
	constructor(props, context) {
		super(props);

		this.state = {
			width: window.innerWidth,
			height: window.innnerHeight,
			scrollX: '0px',
			scrollY: '3rem'
		}

		this.onScroll = this.onScroll.bind(this);
		this.createNoteAt = this.createNoteAt.bind(this);
		this.createNoteBefore = this.createNoteBefore.bind(this);
	}

	render(props, state) {
		return (
			<div 
				style={Style.weave}
				ref={el => this.el = el}
			>
				<div style={Style.header}>&nbsp;</div>
				<ThreadView
					threads={Store.threads}
					width={state.width + 'px'}
				/>
				<ThreadLabels
					threads={Store.threads}
					newThread={state.newThread}
					scrollX={state.scrollX}
				/>
				<div>
					{this.renderSlices(Store.slices)}
				</div>
			</div>
		)
	}

	renderSlices(slices) {
		var output = [],
			i = -1;
		while (++i < slices.length) output.push(
			<div style={Style.slice}>
				{(i === 0) ?
					<SliceDivider
						id={i}
						threads={Store.threads}
						createNote={this.createNoteBefore}
					/>
				: ''}
				<SliceView
						id={i}
						header={slices[i].datetime}
						threads={Store.threads}
						notes={Store.threadNotesInSlice(i)}
						createNote={this.createNoteBefore}
						editFunc={this.props.editNote}
						scrollY={this.state.scrollY}
				/>
				<SliceDivider
					id={i+1}
					threads={Store.threads}
					createNote={this.createNoteBefore}
				/>
			</div>
		);
		return output;
	}

	componentDidMount() {
		this.props.menu();

		this.body = document.getElementsByTagName("body")[0];
		this.toolbar = document.getElementById('toolbar');

		this.height = (this.el.clientHeight < window.innerHeight) ? window.innerHeight : this.el.clientHeight;
		this.width = (this.el.clientWidth < window.innerWidth) ? window.innnerWidth : this.el.clientWidth;

		window.addEventListener('scroll', this.onScroll);
	}

	componentDidUnmount() {
		window.removeEventListener('scroll', this.onScroll);
	}

	componentDidUpdate() {
		var h = (this.el.clientHeight < window.innerHeight) ? window.innerHeight : this.el.clientHeight,
			w = (this.el.clientWidth < window.innerWidth) ? window.innerWidth : this.el.clientWidth;

		if (this.state.height !== h || this.state.width !== w) this.setState({
			height: h,
			width: w
		});
	}

	createNoteBefore(index, thread) {
		// create new slice before slice at index
		this.store.slices.splice(index, 0, {
			datetime: '1999-10-26',
			notes: [{
				id: (new Date()).toJSON(),
				revision: 0,
				thread: thread,
				location: 0,
				head: '',
				wc: 0
			}]
		});
	}
	createNoteAt(index, thread) {
		// create new note for thread at slice index
		var notes = this.store.slices[index].notes,
			i = notes.length - 1,
			note = {
				id: (new Date()).toJSON(),
				revision: 0,
				thread: thread,
				location: 0,
				head: '',
				wc: 0
			};

		if (thread > notes[i++].thread) notes.push(note);
		else while (i--) if (thread < notes[i].thread) {
			notes.splice(i, 0, note);
			break;
		}
	}
	newThread() {
		// create new thread
		this.store.threads.push({
			color: '#0066ff',
			shade: '#0044dd',
			name: 'Terence Hagarmeyer'
		});
	}
	onScroll(event) {
		this.setState({
			scrollX: this.body.scrollLeft + 'px',
			scrollY: (this.toolbar.clientHeight + this.body.scrollTop) + 'px'
		});
	}
}

module.exports = WeaveView;