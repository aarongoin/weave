const
	React = require('preact'),

	Bind = require('../bind.js'),

	DragListWithFolders = require('./DragListWithFolders.js'),

	TabbedSidebar = require('./TabbedSidebar.js'),

	Button = require('../buttons.js'),

	Style = {
		sidebar: {
			zIndex: 50,
			position: 'fixed',
			width: '18rem',
			top: 0,
			bottom: 0,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'stretch',
			borderRight: '1px solid #000',
			backgroundColor: "#444",
			transition: 'left 0.3s ease-in-out'
		},
		toolbar: {
			flexGrow: 0,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'flex-start',
			alignItems: 'stretch',
			padding: '0 0.25rem'
		},
		scene: {
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
			padding: '0.25rem',
			marginTop: '0.5rem'
		},
		item: {
			margin: '0 0.8rem 0 0.8rem',
			border: 'none',
			outline: 'none',
			backgroundColor: 'inherit',
			color: '#fff',
			width: '1rem',
			height: '1rem',
			cursor: 'pointer'
		},
		row: {
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'center',
			color: '#fff',
			fontSize: '0.8rem',
			height: '2rem'
		},
		issues: {
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
			margin: '0 0 0.25rem 0',
			fontSize: '0.8rem',
			color: '#fff'
		},
		searchBar: {
			height: '1.75rem',
			display: 'flex',
			alignItems: 'center',
			backgroundColor: '#fff',
			marginBottom: '0.5rem'
		},
		search: {
			flexGrow: 1,
			//maxWidth: '24.4rem',
			padding: '0 0.75rem',
			border: 'none',
			outline: 'none',
			textAlign: "center"
		},
		button: {
			width: '5rem',
			height: '1.75rem',
			padding: '0.25rem',
			border: 'none',
			outline: 'none',
			backgroundColor: "#333",
			borderRadius: '0.25rem',
			color: '#fff',
			fontSize: '1rem',

			cursor: 'pointer'
		},
		spacer: {
			height: '100vh',
			transition: 'width 0.3s ease-in-out'
		}
	};

class ProjectSidebar extends React.Component {
	constructor(props, context) {
		super(props, context);

		props.register(() => this.setState({toggled: !this.state.toggled}));

		this.state = {
			toggled: true
		};

		Bind(this);
	}

	render(props, state, context) {
		return (
			<div><div style={Object.assign({width: state.toggled ? '18rem' : 0}, Style.spacer)}>&nbsp;</div>
				<div style={Object.assign({left: state.toggled ? 0 : '-18.5rem'}, Style.sidebar)}>
					<TabbedSidebar
						style={{borderTop: 'none'}}
						default={3}
						buttons={["help", "books", "print", "eye"]}
						tabs={[
							null,
							null,
							null,
							[<div style={Style.toolbar}>
								<div style={Style.searchBar}>
									<input
										style={Style.search}
										type="text"
										placeholder="Filter"
										maxLength="80"
										size="24"
										onInput={(e) => context.Do('ModifySearch', e.target.value)}
										value={props.project.search}
										onkeyup={(e) => e.keyCode === 13 ? e.currentTarget.blur() : undefined}
									/>
								</div>
								<div style={Style.issues}>
									<span class="noselect">{props.project.meta.wc + ' words'}</span>
									<span class="noselect">{props.project.meta.sc + ' scenes'}</span>
								</div>
							</div>,
							<DragListWithFolders
								type="Thread"
								btnColor="#fff"
								visible={props.project.visible}
								free={props.project.threadList}
								folders={props.project.threadFolders}
							/>,
							<DragListWithFolders
								type="Location"
								btnColor="#fff"
								visible={props.project.visible}
								free={props.project.locationList}
								folders={props.project.locationFolders}
							/>]
						]}
					/>
				</div>
			</div>
		);
	}
}

module.exports = ProjectSidebar;