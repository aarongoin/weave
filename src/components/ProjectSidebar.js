const
	React = require('preact'),

	Bind = require('../bind.js'),

	DragListWithFolders = require('./DragListWithFolders.js'),

	TabbedSidebar = require('./TabbedSidebar.js'),

	Button = require('../buttons.js'),

	PrintView = require('./PrintView.js'),
	HelpView = require('./HelpView.js'),

	ImmutableInput = require('./ImmutableInput.js'),

	Style = {
		sidebar: {
			zIndex: 50,
			position: 'fixed',
			top: 0,
			bottom: 0,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'stretch',
			//paddingRight: "0.25rem",
			//borderRight: '1px solid #000',
			backgroundColor: "#999",
			transition: 'left 0.3s ease-in-out, width 0.3s ease-in-out'
		},
		text: {
			padding: '0.3rem 0.5rem',
			border: 'none',
			outline: 'none',
			color: '#000',
			//textShadow: '0 0 0.25rem #111'

			margin: '0.5rem',
			borderRadius: '0.15rem',
			fontSize: '1rem',
			fontWeight: "bold"
		},
		toolbar: {
			flexShrink: "0",
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'flex-start',
			alignItems: 'stretch',
			padding: '0.25rem 0.5rem 0 0.5rem'
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
			color: '#000'
		},
		searchBar: {
			height: '1.75rem',
			display: 'flex',
			alignItems: 'center',
			padding: '0.15rem 0.4rem 0.4rem 0.4rem',
			//borderBottom: "1px solid #000"
		},
		search: {
			flexGrow: 1,
			padding: '0.25rem 0.5rem',
			border: 'none',
			outline: 'none',
			textAlign: "center",
			fontSize: "1rem",
			borderRadius: "0.25rem"
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

		this.state = {
			width: "20rem",
			hidden: "-20.5rem"
		};

		Bind(this);
	}

	render(props, state, context) {
		return (
			<div>
				<div style={Object.assign({width: props.toggled ? state.width : 0}, Style.spacer)}>&nbsp;</div>
				<div style={Object.assign({left: props.toggled ? 0 : state.hidden}, Style.sidebar, {width: state.width})}>
					<TabbedSidebar
						style={{borderTop: 'none'}}
						tab={props.tab}
						buttons={["help", "print", "craft"]}
						text={["Help", "Book", "Plot"]}
						onTab={this.onTab}
						tabs={[
						// HELP
							<HelpView/>,
						// PRINT
							<div style={{flexShrink: "0", flexGrow: 1, height: "96vh", display: "flex", flexDirection: "column"}}>
									<ImmutableInput placeholder="Book Title" maxLength="64" value={props.project.meta.title}
										class="noselect" type="text" style={Style.text}
										onmouseover={(e) => (e.target.readOnly = true)}
										onclick={(e) => {
											e.target.focus();
										}}
										onfocus={(e) => {
											e.target.readOnly = false;
											e.target.class = "";
										}}
										onchange={(e) => context.Do('ModifyMeta', { title: e.target.value })}
										onblur={(e) => {
											e.target.readOnly = true;
											e.target.class = "noselect";
										}}
									/>
									<ImmutableInput placeholder="Author" maxLength="30" value={props.project.meta.author}
										class="noselect" type="text" style={Style.text}
										onmouseover={(e) => (e.target.readOnly = true)}
										onclick={(e) => {
											e.target.focus();
										}}
										onfocus={(e) => {
											e.target.readOnly = false;
											e.target.class = "";
										}}
										onchange={(e) => context.Do('ModifyMeta', { author: e.target.value })}
										onblur={(e) => {
											e.target.readOnly = true;
											e.target.class = "noselect";
										}}
									/>
								<PrintView
									chapters={props.project.chapters}
									settings={props.project.printSettings}
									print={props.print}
								/>
							</div>,
						// EYE
							[<div style={Style.toolbar}>
								<div style={Style.searchBar}>
									<ImmutableInput
										id="searchBar"
										style={Style.search}
										placeholder="Search"
										maxLength="80"
										size="24"
										oninput={(e) => context.Do('ModifySearch', e.target.value)}
										value={props.project.search}
									/>
								</div>
								<div style={Style.issues}>
									<span class="noselect">{props.scenes + ' scenes'}</span>
									<span class="noselect">{props.notes + ' notes'}</span>
								</div>
							</div>,
							<DragListWithFolders
								key="threads"
								type="Thread"
								btnColor="#fff"
								visible={props.project.visible}
								free={props.project.threadList}
								folders={props.project.threadFolders}
							/>,
							<DragListWithFolders
								key="locations"
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

	onTab(i) {
		var w = 20;
		this.props.onTab(i);
		switch (i) {
			case 0: w = 20; break;
			case 1: w = 20; break;
		}
		this.setState({
			width: w + "rem",
			hidden: "-" + (w + 0.5) + "rem"
		});
	}
}

module.exports = ProjectSidebar;