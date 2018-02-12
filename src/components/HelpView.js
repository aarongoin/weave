const
	React = require('preact'),

	Bind = require('../bind.js'),

	ModalView = require('./ModalView.js'),

	Colors = require('../colors.js'),
	SidebarItem = require('./SidebarItem.js'),
	DragList = require('./DragList.js'),
	ScrollingView = require('./ScrollingView.js'),
	Button = require('../buttons.js'),
	Draggable = require('./Draggable.js'),
	DropZone = require('./DropZone.js'),

	ImmutableInput = require('./ImmutableInput.js'),

	Style = {
		title: {
			fontSize: "1.5rem",
			fontWeight: "bold"
		},
		subtitle: {
			fontSize: "1.2rem",
			fontWeight: "bold",
			height: '1.5rem'
		},
		body: {
			margin: "0.5rem 0 0 0",
			fontSize: "1rem",
			fontWeight: "normal",
			width: "100%"
		},
		modal: {
			posiition: "relative",
			backgroundColor: '#fff',
			color: "#000",
			borderRadius: "0.15rem",
			alignItems: "flex-start",
			width: "50rem"
		},
		img: {
			backgroundColor: "#777",
			float: "left",
			width: "25rem",
			marginRight: "1rem",
			height: "25rem"
		},
		box: {
			backgroundColor: '#fff',
			color: "#000",
			margin: "0 0.5rem 0.5rem 0.5rem",
			padding: "0.25rem 0.5rem",
			borderRadius: "0.15rem"
		},
		button: {
			color: "#000",
			textDecoration: "none",
			cursor: 'pointer',
			margin: "0.15rem 0 0.15rem 1rem"
		},
		group: {
			display: "flex",
			flexDirection: "column",
			paddingLeft: "1rem"
		},
		header: {
			fontSize: "0.9rem",
			fontWeight: "bold",
			margin: "0.25rem 0"
		},
		current: {
			margin: "0.5rem",
			width: "1rem",
			height: "1rem",
			borderRadius: "0.5rem",
			backgroundColor: "#444",
		},
		page: {
			margin: "0.5rem",
			width: "1rem",
			height: "1rem",
			borderRadius: "0.5rem",
			backgroundColor: "#ccc",
			cursor: "pointer"
		},
		textLink: {
			color: "#000",
			textDecoration: "none",
			cursor: 'pointer',
			fontWeight: "bold"
		}
	};

var HelpButtons = [
	"User Interface",
	"Scenes",
	"Notebar",
	"Plot Sidebar",
	["Places", "Threads", "Search"],
	"Book Sidebar",
	["Chapters", "Printing"]
];

var HelpText = {
	"User Interface": [
		"Weave is mouse and keyboard driven.",
		"On the left is the Sidebar, which can be shown/hidden using: CMD B (Mac) or CTRL B (Windows/Linux)",
		"On the right is the Notebar, which can be shown/hidden using: CMD K (Mac) or CTRL K (Windows/Linux)",
		"In the Plot Sidebar is the Search bar, which can be accessed from keyboard using: CMD F (Mac) or CTRL F (Windows/Linux)",
		"The main view shows Place columns with any visible scenes layed in time order.",
		"You can increase/decrease the font size using: CMD +/- (Mac) or CTRL +/- (Windows/Linux)",
		"Delete buttons require you to hold down the mouse button to really confirm your intention."
	],
	"Scenes": [
		"Scenes are the foundational building block of your story.",
		"You must have an existing and visible Place to create a Scene. Click the add button at the top of each Place column to add a Scene to that location. Dates can be as broad as a year, or can specified down to the minute. If there exists a Scene with a conflicting date, or the date is invalid: the scene will not be created when you press Enter.",
		"Click on the edit button on a Scene to enter the distraction-free writing mode"
	],
	"Notebar": [
		"Weave understands that Notes are critical for good storytelling, and the Notebar keeps your notes right next to wherever you're working.",
		"Notes can be tagged with Threads and Places so they'll only show up when they're relevant."
	],
	"Plot Sidebar": [
		"The Plot Sidebar is where you can create and modify Places and Threads, as well as Folders to organize them.",
		"You can Search and/or Hide Scenes and Notes based on their Place and Thread, and their text contents."
	],
	"Places": [
		"Your Scenes unfold in Places.",
		"Places can be grouped into named Folders, and all Places within a Folder can be hidden or shown at once."
	],
	"Threads": [
		"Threads make it easy to track your characters through Scenes, but can be used for any important element in your story: like the Ring of Power, or the Thumb Drive of Secrets.",
		"As with Places: Threads can be grouped into named Folders, and can be hidden or shown at once."	
	],
	"Search": [
		"Searching your Scenes and Notes is trivial with the Search Bar.",
		"Search is not case-sensitive, and only Scenes and Notes containing the Search term in their text content, or in their tagged Thread or Location name(s)."
	],
	"Book Sidebar": [
		"The Book Sidebar is where you can name your Book and layout your Scenes in Chapters",
		"At the top of this Sidebar, you can name your Book, and yourself as it's Author.",
		"Below the Title and Author fields is the Chapters list, where you can layout your Chapters.",
		"At the bottom is the Print Panel where you can print your Book."
	],
	"Chapters": [
		"Click the add button to create a new Chapter.",
		"Drag and drop Scenes or Notes onto any Chapter to add them to it.",
		"If you want to rearrange your chapters: drag and drop them."
	],
	"Printing": [
		"The Print Panel is where you can toggle which fields within a Scene you would like to be printed.",
		"Pressing the Print button will open the File Saving dialog box where you can choose where to save the plain text printed output of your Book."
	]
}

class HelpView extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			modal: undefined
		}
		this.focus = false;

		Bind(this);
	}

	renderButton(stringOrArray, i) {
		return (typeof stringOrArray === "string" ?
			<span
				style={Style.button}
				onmouseenter={(e) => e.target.style.fontWeight = "bold"}
				onmouseleave={(e) => e.target.style.fontWeight = "normal"}
				onclick={() => this.setState({modal: stringOrArray})}
			>
				{stringOrArray}
			</span>
		:
			<div style={Style.group}>
				{stringOrArray.map(this.renderButton)}
			</div>
		)
	}

	render(props, state, context) {
		return (
			<ScrollingView
				style={{
					flexGrow: 1,
					width: '100%',
					minHeight: '1rem',
					display: "flex",
					flexDirection: "column",
					alignItems: "stretch"
				}}
			>
				<SidebarItem
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "stretch",
						color: "#000",
						fontSize: "1rem",
						padding: "0"
					}}
					buttons={
						<span style={Style.header}>About</span>
					}
				>
					<div style={Style.box}>
						<p>
							Weave is an app for writers.&nbsp;
							<b>Place</b> your <b>Scenes</b> in time, and <b>Thread</b> your characters through them.&nbsp;
							<b>Write</b> your scenes in a simple, distraction-free text editor.&nbsp;
							Search your <b>Notes</b> and <b>Scenes</b> with ease.
						</p>
						<p style={{color: "salmon"}}><br/>
							Weave is currently in <b>open alpha</b>, and contains a number of awful, awful bugs...
						</p>
					</div>
				</SidebarItem>
				<SidebarItem
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-start",
						color: "#000",
						fontSize: "1rem",
						padding: "0 0 0.25rem 0",
						borderTop: "1px solid #000"
					}}
					buttons={
						<span style={Style.header}>Topics</span>
					}
				>
					{HelpButtons.map(this.renderButton)}
				</SidebarItem>
				{/*<SidebarItem
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "stretch",
						color: "#000",
						fontSize: "1rem",
						padding: "0 0 0.25rem 0",
						borderTop: "1px solid #000"
					}}
					buttons={
						<span style={Style.header}>Contact Us</span>
					}
				>
					<div style={Style.box}>How to contact us...</div>
				</SidebarItem>*/}
				<SidebarItem
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "stretch",
						color: "#000",
						fontSize: "1rem",
						padding: "0 0 0.25rem 0",
						borderTop: "1px solid #000"
					}}
					buttons={
						<span style={Style.header}>Report A Bug</span>
					}
				>
					<div style={Style.box}>
						<p>If you discover something you think is wrong, or would like to share your ideas for improvement: please open an issue <a href="http://bitbucket.org/ickelbawd/weave" target="_blank" style={Style.textLink}>here</a>.</p>
						<p style={{marginTop: "0.5rem"}}>If you can determine the steps you took to produce the error: please include them clearly in your issue description.</p>
					</div>
				</SidebarItem>
				{state.modal ?
					<ModalView
						dismiss={() => this.setState({modal: undefined})}
						innerStyle={Style.modal}
					>
						{this.renderModal(state.modal)}
					</ModalView>
				: ""}
			</ScrollingView>
		);
	}


	renderModal(view) {
		switch(view) {
			case "Scenes":
			case "Notebar":
			case "User Interface":
			return [
				<div style={Style.title}>{view}</div>,
				<section style={Style.body}>
					<img style={Style.img} src={"/dist/img/help/" + view + ".gif"}/>
					{HelpText[view].map((text, i) => (
						<p style={{marginTop: "0.5rem"}}>{text}</p>
					))}
				</section>
			];
			case "Plot Sidebar":
			case "Places":
			case "Threads":
			case "Search":
			return [
				<div style={Style.title}>Plot Sidebar</div>,
				view !== "Plot Sidebar" ? <div style={Style.subtitle}>{view}</div> : "",
				<section style={Style.body}>
					<img style={Style.img} src={"/dist/img/help/Plot Sidebar.gif"}/>
					{HelpText[view].map((text, i) => (
						<p style={{marginTop: "0.5rem"}}>{text}</p>
					))}
				</section>,
				<div style={{width: "100%", marginTop: "1rem", display: "flex", justifyContent: "flex-end"}}>
					{["Plot Sidebar", "Places", "Threads", "Search"].map((item) => (
						<span style={view === item ? Style.current : Style.page}
							onmouseenter={(e) => e.target.style.backgroundColor = view === item ? "#444" : "#999"}
							onmouseleave={(e) => e.target.style.backgroundColor = view === item ? "#444" : "#ccc"}
							onclick={() => this.setState({modal: item})}
						>&nbsp;</span>
					))}
				</div>
			];
			case "Book Sidebar":
			case "Chapters":
			case "Printing":
			return [
				<div style={Style.title}>Book Sidebar</div>,
				<div style={Style.subtitle}>{view !== "Book Sidebar" ? view : ""}</div>,
				<section style={Style.body}>
					<img style={Style.img} src={"/dist/img/help/Book Sidebar.gif"}/>
					{HelpText[view].map((text, i) => (
						<p style={{marginTop: "0.5rem"}}>{text}</p>
					))}
				</section>,
				<div style={{width: "100%", marginTop: "1rem", display: "flex", justifyContent: "flex-end"}}>
					{["Book Sidebar", "Chapters", "Printing"].map((item) => (
						<span style={view === item ? Style.current : Style.page}
							onmouseenter={(e) => e.target.style.backgroundColor = view === item ? "#444" : "#999"}
							onmouseleave={(e) => e.target.style.backgroundColor = view === item ? "#444" : "#ccc"}
							onclick={() => this.setState({modal: item})}
						>&nbsp;</span>
					))}
				</div>
			];
		}
	}

}
module.exports = HelpView;