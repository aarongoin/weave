const
	React = require('preact'),

	Bind = require('../bind.js'),

	Colors = require('../colors.js'),
	SidebarItem = require('./SidebarItem.js'),
	DragList = require('./DragList.js'),
	ScrollingView = require('./ScrollingView.js'),
	Button = require('../buttons.js'),
	Draggable = require('./Draggable.js'),
	DropZone = require('./DropZone.js'),

	Style = {
		text: {
			flexGrow: 1,
			padding: '0.3rem 0.5rem 0.3rem 0',
			border: 'none',
			outline: 'none',
			backgroundColor: 'rgba(0,0,0,0)',
			fontSize: '1.15rem',
			textAlign: "center",
			color: '#000'
		},
		project: {
			display: 'flex',
			flexDirection: "column",
			alignItems: 'stretch',
			backgroundColor: "#fff",
			color: "#000",
			padding: "0.25rem 0.5rem",
			borderRadius: "0.15rem"
		},
		line: {
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
			fontSize: '0.9rem',
			padding: "0.25rem 0.5rem",
			margin: '0'
		},
		hide: {
			cursor: 'pointer',
			marginRight: '1rem',
			width: '1rem',
			height: '1rem'
		},
		delete: {
			cursor: 'pointer',
			marginRight: '0.5rem',
			width: '1rem',
			height: '0.9rem'
		},
		list: {
			flexDirection: 'column',
			padding: '0 0.25rem'
		},
		item: {
			margin: '0 0.25rem',
			width: '1rem',
			height: '1rem',
			border: 'none',
			outline: 'none',
			backgroundColor: 'inherit',
			color: '#fff',
			fontSize: '1.2rem',
			cursor: 'pointer',
			lineHeight: '1rem',
		},
		button: {
			fontSize: '1rem',
			fontStyle: "bold",
			color: "#000",
			border: 'none',
			outline: 'none',
			backgroundColor: 'rgba(255, 255, 255, 0.5)',
			cursor: 'pointer',
			borderRadius: "0.15rem",
			padding: "0.25rem 0.5rem"
		},
		row: {
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'center',
			color: '#fff',
			fontSize: '0.8rem'
		},
	};

class LibraryView extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			hover: -1
		}
		this.focus = false;

		Bind(this);
	}

	render(props, state, context) {
		return (
			<div style={{flexGrow: 1, height: "100vh", display: "flex", flexDirection: "column"}}>
				<SidebarItem
					style={{flexGrow: 1}}
					buttons={[
						<span style={{fontSize: "0.9rem", color: "#000", fontWeight: "bold"}}>Library</span>,
						<Button
							img="add"
							color="#444"
							hoverColor="#000"
							style={Style.item}
							onclick={(e) => {
								console.log("TODO: add project");
							}}
						/>
					]}
				>
					<ScrollingView
						style={{
							flexGrow: 1,
							//width: '100%',
							minHeight: '1rem',
							padding: "0 0.25rem"
						}}
					>
					{Object.keys(props.projects).map((key) => {
						var project = props.projects[key];
						return (
							<div
								style={Style.project}
								onmouseover={(e) => this.onHover(project.id)}
								onmouseleave={(e) => this.onHover(-1)}
							>
								<input placeholder="Name" maxLength="40" value={project.title}
									class="noselect" type="text" style={Style.text}	
									onmouseover={(e) => (e.target.readOnly = true)}
									onclick={(e) => {
										e.target.readOnly = false;
										e.target.class = ""
										e.target.focus();
									}}
									onInput={(e) => {
										context.Do('ModifyMeta', {
											title: e.target.value
										});
									}}
									onblur={(e) => {
										e.target.readOnly = true;
										e.target.class = "noselect";
									}}
									onkeyup={(e) => e.keyCode === 13 ? e.currentTarget.blur() : undefined}
								/>
								<div style={Style.line}>
									<div>{project.wc + " words"}</div>
									<div>{project.sc + " scenes"}</div>
									<div>{project.nc + " notes"}</div>
								</div>
								<div style={Object.assign({}, Style.line, {justifyContent: "space-between"})}>
									<div>{"modified: " + this.mapModified(project.modified)}</div>
									<div style={{width: "1rem"}}>
									{state.hover === project.id ?
										<span>X</span>
									: ""}
									</div>
								</div>
							</div>
						);
					})}
					</ScrollingView>
				</SidebarItem>
			</div>
		);
	}

	mapModified(modified) {
		var delta = (Date.now() - Date.parse(modified)) / 1000,
			test;

		// year(s)
		test = (delta / 2628000) >> 0;
		if (test > 1) return (test + " years ago");
		else if (test === 1) return (test + " year ago");

		// month(s)
		test = (delta / 2628000) >> 0;
		if (test > 1) return (test + " months ago");
		else if (test === 1) return (test + " month ago");

		// week(s)
		test = (delta / 604800) >> 0;
		if (test > 1) return (test + " weeks ago");
		else if (test === 1) return (test + " week ago");

		// day(s)
		test = (delta / 86400) >> 0;
		if (test > 1) return (test + " days ago");
		else if (test === 1) return (test + " day ago");

		// hour(s)
		test = (delta / 3600) >> 0;
		if (test > 1) return (test + " hours ago");
		else if (test === 1) return (test + " hour ago");

		// minute(s)
		test = (delta / 60) >> 0;
		if (test > 1) return (test + " minutes ago");
		else if (test === 1) return (test + " minute ago");

		// second(s)
		test = delta >> 0;
		if (test > 1) return (test + " seconds ago");
		else if (test === 1) return (test + " second ago");

	}

	onHover(id) {
		this.setState({hover: id});
	}
}
module.exports = LibraryView;