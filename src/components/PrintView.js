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

	ImmutableInput = require('./ImmutableInput.js'),

	Style = {
		text: {
			flexGrow: 1,
			width: "8.75rem",
			padding: '0.3rem 0.5rem 0.3rem 0',
			border: 'none',
			outline: 'none',
			backgroundColor: 'rgba(0,0,0,0)',
			fontSize: '0.9rem',
			color: '#fff',
			textShadow: '0 0 0.25rem #111'
		},
		scene: {
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
			backgroundColor: "#fff",
			color: "#000",
			fontSize: '0.9rem',
			padding: "0.25rem 0.5rem",
			margin: '2px 0 0 1rem',
			borderRadius: "0.15rem"
		},
		thread: {
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
			fontSize: '0.9rem',
			padding: "0.25rem 0.5rem",
			margin: '0',
			borderRadius: "0.15rem"
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

class PrintView extends React.Component {
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
			<div style={{flexShrink: "0", flexGrow: 1, height: "60vh", display: "flex", flexDirection: "column"}}>
				<SidebarItem
					style={{flexGrow: 1, borderTop: "1px solid #000"}}
					buttons={[
						<span style={{fontSize: "0.9rem", color: "#000", fontWeight: "bold"}}>Chapters</span>,
						<Button
							img="add"
							color="#444"
							hoverColor="#000"
							style={Style.item}
							onclick={(e) => {
								var chapters = props.chapters;
								chapters.unshift({
									title: "",
									scenes: []
								});
								context.Do('ModifyChapters', chapters);
							}}
						/>
					]}
				>
					<ScrollingView
						style={{
							flexGrow: 1,
							width: '100%',
							minHeight: '1rem'
						}}
					>
						<DragList
							style={Style.list}
							type="Chapter"
							items={props.chapters}
							onMove={this.moveChapter}
							item={(chapter, index) => {
								var scenes = chapter.scenes.map((scene) => context.Get(scene));
								return (<this.renderFolder
									chapter={chapter}
									scenes={scenes}
									wc={scenes.reduce((sum, scene) => (sum + scene.wc), 0)}
									index={index}
								/>);
							}}
						/>
					</ScrollingView>
				</SidebarItem>
				<div style={{flexShrink: "0", color: "#000", fontSize: "1rem", margin: "0 0.5rem 0.15rem 0.5rem", display: "flex", flexDirection: "column", alignItems: "center", borderTop: "1px solid #000"}}>
					<div>
						<div style={{marginTop: "0.25rem"}}>
							<input type="checkbox" id="printBody" value="Body"
								checked={props.settings.body}
								onClick={(e) => {
									context.Do('ModifyPrintSettings', {body: e.target.checked});
								}}
							/>
							<label for="printBody" style={{marginLeft: "0.5rem"}}>Include Scene Body</label>
						</div>
						<div style={{marginTop: "0.25rem"}}>
							<input type="checkbox" id="printSummary" value="Summary"
								checked={props.settings.summary}
								onClick={(e) => context.Do('ModifyPrintSettings', {summary: e.target.checked})}
							/>
							<label for="printSummary" style={{marginLeft: "0.5rem"}}>Include Scene Summary</label>
						</div>
						<div style={{marginTop: "0.25rem"}}>
							<input type="checkbox" id="printDate" value="Date"
								checked={props.settings.date}
								onClick={(e) => context.Do('ModifyPrintSettings', {date: e.target.checked})}
							/>
							<label for="printDate" style={{marginLeft: "0.5rem"}}>Include Scene Date</label>
						</div>
						<div style={{marginTop: "0.25rem"}}>
							<input type="checkbox" id="printThreads" value="Threads"
								checked={props.settings.threads}
								onClick={(e) => context.Do('ModifyPrintSettings', {threads: e.target.checked})}
							/>
							<label for="printThreads" style={{marginLeft: "0.5rem"}}>Include Scene Threads</label>
						</div>
						<div style={{marginTop: "0.25rem"}}>
							<input type="checkbox" id="printLocation" value="Location"
								checked={props.settings.location}
								onClick={(e) => context.Do('ModifyPrintSettings', {location: e.target.checked})}
							/>
							<label for="printLocation" style={{marginLeft: "0.5rem"}}>Include Scene Location</label>
						</div>
						<div style={{margin: "0.75rem 0 0.5rem 0", float: "right"}}>
							<span
								style={Style.button}
								onclick={props.print}
								onmouseover={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.8)"}
								onmouseleave={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.5)"}
								onmousedown={(e) => e.currentTarget.style.backgroundColor = "#fff"}
							>print</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	renderItem(props, context) {
		return (
			<div
				style={Style.scene}
				onmouseover={(e) => this.onHover(props.item.id)}
				onmouseleave={(e) => this.onHover(-1)}
			>
				<span>{props.item.summary !== "" ? props.item.summary : '&nbsp;'}</span>
				<div style={{width: "1rem"}}>
				{(this.state.hover === props.item.id) ?
					<Button
						noOpacity
						img="delete"
						color="#000"
						hoverColor="#f00"
						style={Style.delete}
						onclick={(e) => {
							if (this.timer) {
								clearTimeout(this.timer);
								this.timer = undefined;
							}
						}}
						onmousedown={(e) => {
							this.timer = setTimeout(this.DeleteChapter, 1000, props.chapter, props.index);
						}}
					/>
				: ""}
				</div>
			</div>
		);
	}

	DeleteChapter(chapter, index) {
		var chapters = this.props.chapters;
		chapters[chapter].scenes.splice(index, 1);
		this.context.Do('ModifyChapters', chapters);
	}

	renderFolder(props, context) {
		return (
			<div style={{marginTop: '1px'}}>
				<DropZone 
					style={Object.assign({backgroundColor: '#666'}, Style.thread, {padding: '0 0.25rem 0 0'})}
					type="scene"
					effect="move"
					onMouseEnter={(e) => this.setState({hover: props.index})}
					onMouseLeave={(e) => this.setState({hover: -1})}
					onDrop={(from) => this.onMove(from, {chapter: props.index, index: 0})}
				>
					<div style={{display: "flex", justifyContent: "space-between", alignItems: "center", width: "15.25rem"}}>
					<span style={{margin: "0 0.5rem"}}>
						{props.index + 1}
					</span>
					<ImmutableInput placeholder="Title" maxLength="30" value={props.chapter.title}
						class="noselect" type="text" style={Style.text}
						onmouseover={(e) => (e.target.readOnly = true)}
						onclick={(e) => {
							e.target.focus();
						}}
						onfocus={(e) => {
							e.target.readOnly = false;
							e.target.class = "";
						}}
						onchange={(e) => {
							var chapters = this.props.chapters;
							chapters[props.index].title = e.target.value;
							context.Do('ModifyChapters', chapters);
						}}
						onblur={(e) => {
							e.target.readOnly = true;
							e.target.class = "noselect";
						}}
					/>
					<span style={{fontSize: "0.8rem"}}>{props.wc + " words"}</span>
					</div>
					<div style={{width: "1rem"}}>
					{(this.state.hover === props.index) ?
						<Button
							img="delete"
							color="#000"
							hoverColor="#f00"
							style={Style.delete}
							onclick={(e) => {
								if (this.timer) {
									clearTimeout(this.timer);
									this.timer = undefined;
								}
							}}
							onmousedown={(e) => {
								var chapters = this.props.chapters;
								chapters.splice(props.index, 1);
								context.Do('ModifyChapters', chapters);
							}}
						/>
					: ""}
					</div>
				</DropZone>
				{props.chapter.scenes.length ?
					<DragList
						style={Object.assign({}, Style.list, {padding: '0'})}
						type="scene"
						items={props.scenes}
						onMove={this.onMove}
						payload={{chapter: props.index}}
						item={(item, index) => (
							<this.renderItem
								item={item}
								index={index}
								chapter={props.index}
							/>
						)}
					/>
				:
					<div>&nbsp;</div>
				}
			</div>
		);
	}

	onHover(id) {
		this.setState({hover: id});
	}

	onMove(from, to) {
		var chapters = this.props.chapters;
		if (typeof from === "string") {
			if (chapters[to.chapter].scenes.indexOf(from) === -1) chapters[to.chapter].scenes.unshift(from);
		} else chapters[to.chapter].scenes.unshift( chapters[from.chapter].scenes.splice(from.index, 1)[0] );
		this.context.Do('ModifyChapters', chapters);
	}

	moveChapter(from, to) {
		var chapters = this.props.chapters;
		chapters.splice(to.index, 0, chapters.splice(from.index, 1)[0]);
		this.context.Do('ModifyChapters', chapters);
	}

	componentDidUpdate() {
		if (this.focus && this.index0) {
			this.focus = false;
			this.index0.focus();
		}
	}
}
module.exports = PrintView;