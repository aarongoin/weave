const
	React = require('preact'),

	ExpandingTextarea = require('./ExpandingTextarea.js'),

	Bind = require('../bind.js'),

	Style = {
		box: {
			position: 'relative',

			backgroundColor: '#fff',
			color: '#222',

			margin: '0 2rem',

			boxShadow: '0 0.15rem 0.5rem rgba(0,0,0,0.5)',
			borderRadius: "0.15rem",

			display: 'flex',
			flexDirection: 'column',
			alignItems: 'stretch',
			//border: '1px solid #fff'
		},
		column: {
			position: 'relative',
			width: '54rem',
			minHeight: '55rem',

			margin: '3rem auto 3rem auto',

			display: 'flex',
			flexDirection: 'column',
			alignItems: 'stretch'
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

			margin: '2rem 2rem 1rem 2rem',
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

			width: '51rem',
			margin: '0 auto',
			padding: '0.75rem 1.5rem 0.75rem 1.5rem',

			display: 'flex',
			flexDirection: 'row',
			justifyContent: 'space-between',

			top: '0',
			position: 'fixed'
		},
		doneButton: {
			fontSize: '1rem',
			fontStyle: "bold",
			border: 'none',
			outline: 'none',
			backgroundColor: 'rgba(255, 255, 255, 0.5)',
			cursor: 'pointer',
			borderRadius: "0.15rem",
			padding: "0 0.5rem",
			marginRight: "0.5rem"
		},
		modal: {
			zIndex: 30,
			width: '100%',
			minHeight: '100vh'
		},
		threads: {
			position: 'fixed',
			flexShrink: 0,
			display: 'flex',
			flexDirection: 'column'
		},
		tooltip: {
			position: 'relative',
			left: '0.7rem',
			top: '-0.25rem',
			padding: "0.25rem 0.5rem",
			borderRadius: "0.5rem",
			color: '#fff',
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
			scene: Object.assign({}, props.scene),
			pages: Math.round(props.scene.wc / 275) || 1,
			pageOf: 1,
			statStyle: Style.statFree
		}

		this.offset = 0;

		Bind(this);
	}

	render(props, state, context) {
		var location = context.Get(props.scene.location);
		return (
			<div
				style={Object.assign({backgroundColor: location.color}, Style.modal)}
			>
				<div style={Style.column}>
					<div
						style={Style.box}
						//onclick={(e) => e.target === e.currentTarget ? this.body.focus() : undefined}
					>
						<ExpandingTextarea
							buffer={500}
							style={Style.sceneHead}
							maxLength="250"
							oninput={(e) => this.context.Do('ModifyScene', {id: props.scene.id, summary: e.target.value})}
							value={props.scene.summary}
							baseHeight="1.7em"
							placeholder="Summary"
							ondragstart={(e) => e.preventDefault()}
						/>
						<ExpandingTextarea
							ref={(el) => (this.body = el ? el.base : undefined)}
							buffer={500}
							style={Style.sceneBody}
							oninput={this.onBody}
							value={props.scene.body}
							baseHeight="1.1em"
							placeholder="Body"
							ondragstart={(e) => e.preventDefault()}
						/>
						<div style={Object.assign({transform: "translate(-" + Math.floor(context.fontSize / 2) + "px," + Math.ceil(context.fontSize / 2) + "px)"}, Style.threads)}>
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
					<span style={Object.assign({backgroundColor: location.color}, Style.stats)}>
						<span style={{display: "flex", alignItems: "flex-end"}}>
							<span style={{fontSize: "1.25rem", marginLeft: "0.5rem"}}>
								{location.name}
							</span>
							<span style={{marginLeft: "2rem"}}>
								{props.scene.time}
							</span>
						</span>
						<span style={{display: "flex", alignItems: "flex-end"}}>
							<span>
								{props.scene.wc + ' words'}
							</span>
							<span style={{marginLeft: "2rem"}}>
								{state.pageOf + ' / ' + state.pages}
							</span>
						</span>
						<span
							style={Object.assign({color: location.color}, Style.doneButton)}
							onclick={(e) => props.dismiss()}
							onmouseover={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.8)"}
							onmouseleave={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.5)"}
							onmousedown={(e) => e.currentTarget.style.backgroundColor = "#fff"}
						>done</span>
					</span>
				</div>
			</div>
		)
	}

	componentDidMount() {
		window.document.body.addEventListener('scroll', this.onScroll);
		window.document.body.addEventListener('resize', this.onResize);

		window.document.body.scrollTo(0, 0);
	}

	componentWillUnmount() {
		window.document.body.removeEventListener('scroll', this.onScroll);
		window.document.body.removeEventListener('resize', this.onResize);
	}

	onBody(e) {
		var wc = count(e.target.value);
		this.state.pages = Math.round(wc / 275) || 1;
		this.onScroll();
		this.context.Do('ModifyScene', {id: this.props.scene.id, body: e.target.value, wc: wc});
		e.preventDefault();
	}

	onScroll() {
		this.pageCount();
		this.offset = window.document.body.scrollTop;
	}

	pageCount() {
		var t;
		if (this.body.clientHeight > window.innerHeight) {
			t = Math.abs(this.body.getBoundingClientRect().top);
			t = (t / this.body.clientHeight) * (this.state.pages + 1);
			t = Math.ceil(t);
			if (t > this.state.pages) t = this.state.pages;
		} else t = 1;
		if (t !== this.state.pageOf) this.setState({ pageOf: t });
	}
}

module.exports = SceneWriter;