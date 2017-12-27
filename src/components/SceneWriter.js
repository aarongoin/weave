const
	React = require('preact'),

	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Bind = require('../bind.js'),

	Style = {
		box: {
			position: 'relative',
			width: '50rem',
			minHeight: '55rem',

			backgroundColor: '#fff',
			color: '#222',

			margin: '3rem auto 3rem auto',


			display: 'flex',
			flexDirection: 'column',
			alignItems: 'stretch',
			boxShadow: '0 0.5rem 0.5rem #222'
			//border: '1px solid #fff'
		},
		top: {
			padding: '0.5rem',

			display: 'flex',
			justifyContent: 'space-around',
			color: '#fff'
		},
		thread: {
			color: '#fff',
			fontSize: '0.75rem',
			height: '1rem',

			borderRadius: '1rem',

			marginBottom: '0.5rem',
			marginRight: '0.5rem',
			padding: '0.25rem 0.5rem 0.2rem 0.5rem'
		},
		sceneHead: {
			color: 'inherit',
			fontSize: '1.5rem',

			margin: '3rem 2rem 1rem 2rem',
			backgroundColor: 'inherit'
		},
		sceneBody: {
			color: 'inherit',
			fontSize: '1.3rem',
			margin: '1rem 2rem 3rem 2rem',
			lineHeight: '130%',
			backgroundColor: 'inherit'
		},
		stats: {
			color: '#fff',
			fontSize: '1.1rem',

			width: '47rem',
			margin: '0 auto',
			padding: '0.75rem 1.5rem 0.75rem 1.5rem',

			display: 'flex',
			flexDirection: 'row',
			justifyContent: 'space-around',

			top: '0',
			position: 'fixed'
		},
		wc: {
			textAlign: 'right',

			display: 'inline-block',
			float: 'right'
		},
		doneButton: {
			fontSize: '1rem',
			fontWeight: 'bold',
			border: 'none',
			outline: 'none',
			backgroundColor: 'rgba(0,0,0,0)',
			cursor: 'pointer'
		},
		modal: {
			zIndex: 30,
			width: '100%',
			minHeight: '100vh'
		},
		threads: {
			position: 'fixed',
			transform: 'translate(-0.5rem, 0.6rem)',
			flexShrink: 0,
			display: 'flex',
			flexDirection: 'column'
		},
		tooltip: {
			position: 'relative',
			left: '0.7rem',
			top: '-0.25rem',
			padding: '0.3rem 0.5rem',
			color: '#fff',
			borderRadius: '1rem',
			whiteSpace: 'nowrap',
			fontSize: '0.8rem'
		},
	},

	testWords = /[\w'’]+(?!\w*>)/igm; // capture words and ignore html tags or special chars

function count(text) {
	var wc = 0;

	testWords.lastIndex = 0;
	while (testWords.test(text)) wc++;
	return wc;
}

class SceneWriter extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			pages: Math.round(props.scene.wc / 275) || 1,
			pageOf: 1,
			statStyle: Style.statFree
		}

		Bind(this);
	}

	render(props, state, context) {
		var location = context.Get(props.scene.location);
		return (
			<div
				style={Object.assign({backgroundColor: location.color}, Style.modal)}
				onclick={(e) => {
					if (e.target === e.currentTarget)
						props.dismiss();
				}}
			>
			<div
				ref={this.mounted}
				style={Style.box}
				onclick={(e) => e.target === e.currentTarget ? this.body.focus() : undefined}
			>
				<ExpandingTextarea
					style={Style.sceneHead}
					maxLength="250"
					onInput={(e) => this.context.Do('ModifyScene', {id: props.scene.id, summary: e.target.value})}
					value={props.scene.summary}
					baseHeight="1.7em"
					placeholder="Summary"
					onDragStart={(e) => e.preventDefault()}
				/>
				<ExpandingTextarea
					ref={(el) => (this.body = el ? el.base : undefined)}
					style={Style.sceneBody}
					onInput={this.onBody}
					value={props.scene.body}
					baseHeight="1.1em"
					placeholder="Body"
					onDragStart={(e) => e.preventDefault()}
				/>
				<span style={Object.assign({backgroundColor: location.color}, Style.stats)}>
					<span style={Style.wc}>
						{props.scene.wc + ' words'}
					</span>
					<span>
						{state.pageOf + '/' + state.pages}
					</span>
					<span>
						{location.name}
					</span>
				</span>
				<div style={Style.threads}>
					{Object.keys(props.scene.thread).map((id, index) => {
						var thread = context.Get(id);
						return (
							<div
								style={{
									borderRadius: '0.5rem',
									width: '1rem',
									height: '1rem',
									backgroundColor: thread.color,
									overflow: 'visible',
									margin: '0.25rem 0'
								}}
								class="tooltip"
							>
								&nbsp;
								<span
									class="tooltipText"
									style={Object.assign({backgroundColor: thread.color}, Style.tooltip)}
								>
									{thread.name}
								</span>
							</div>
						);
					})}
				</div>
			</div>
			</div>
		)
	}

	componentDidMount() {
		window.addEventListener('scroll', this.onScroll);
		window.addEventListener('resize', this.onResize);

		window.scrollTo(0, 0);
	}

	componentWillUnmount() {
		window.removeEventListener('scroll', this.onScroll);
		window.removeEventListener('resize', this.onResize);
	}

	onBody(e) {
		var wc = count(e.target.value);
		this.state.pages = Math.round(wc / 275) || 1;
		this.onScroll();
		this.context.Do('ModifyScene', {id: this.props.scene.id, body: e.target.value, wc: wc})
	}

	onScroll() {
		this.pageCount();
	}

	pageCount() {
		var t;
		if (this.body.clientHeight > window.innerHeight) {
			t = Math.abs(this.body.getBoundingClientRect().top);
			t = (t / this.body.clientHeight) * (this.state.pages + 1);
			t = Math.ceil(t);
			if (t > this.state.pages) t = this.state.pages;
		} else t = 1;
		this.setState({ pageOf: t });
	}
}

module.exports = SceneWriter;