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
			//flexGrow: 1,
			width: '10rem',
			padding: '0.3rem 0.5rem 0.3rem 0',
			border: 'none',
			outline: 'none',
			backgroundColor: 'rgba(0,0,0,0)',
			fontSize: '0.9rem',
			color: '#fff',
			//textShadow: '0 0 0.25rem #111'
		},
		thread: {
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
			fontSize: '0.9rem',
			padding: "0 0 0 0.5rem",
			margin: '1px 0',
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
			height: '1rem'
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
		row: {
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'center',
			color: '#fff',
			fontSize: '0.8rem'
		},
	};

class DragListWithFolders extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			hover: -1,
			colorPicker: false
		}

		Bind(this);
	}

	render(props, state, context) {
		return (
			<SidebarItem
				style={{flexGrow: 1, minHeight: "40vh", borderTop: "1px solid #000"}}
				buttons={[
					<Button
						img={props.type}
						color="#000"
						text={props.type === "Thread" ? "Threads" : "Places"}
						noOpacity
					/>,
					<Button
						img="group"
						color="#444"
						hoverColor="#000"
						style={Style.item}
						onclick={(e) => {
							context.Do('New' + props.type + 'Folder');
						}}
					/>,
					<Button
						img="add"
						color="#444"
						hoverColor="#000"
						style={Style.item}
						onclick={(e) => {
							this.setState({colorPicker: true})
						}}
					/>
				]}
			>
				{state.colorPicker ?
					<div style={Object.assign({}, Style.thread, {position: "relative", height: "1.8rem", margin: "1px 0.25rem", padding: "0", borderRadius: "0.25rem", overflow: "hidden"})}>
						{Colors[props.type].map((color, index) => (
							<span
								class="noselect"
								style={{flexGrow: "1", height: "100%", backgroundColor: color, cursor: 'pointer'}}
								onclick={(e)=>{
									this.state.colorPicker = false;
									context.Do('New' + props.type, {index: 0, color: color});
								}}
							>&nbsp;</span>
						))}
						<div style={{position: "absolute", width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", pointerEvents: "none"}}>
							<span class="noselect">Pick a color.</span>
						</div>
					</div>
				: ""}
				<ScrollingView
					style={{
						flexGrow: 1,
						width: '100%',
						minHeight: '1rem'
					}}
				>
					<DragList
						style={Style.list}
						type={props.type}
						items={props.free}
						onMove={this.onMove}
						item={(item, index) => (
							<this.renderItem
								key={item}
								item={context.Get(item)}
								index={index}
								inset="0"
							/>
						)}
					/>
					<DragList
						style={Style.list}
						type="Folder"
						items={props.folders}
						onMove={this.moveFolder}
						item={(folder, index) => (
							<this.renderFolder
								key={folder}
								folder={context.Get(folder)}
								index={index}
							/>
						)}
					/>
				</ScrollingView>
			</SidebarItem>
		);
	}

	renderItem(props, context) {
		return (
			<div style={Object.assign({}, Style.thread, {
					backgroundColor: props.item.color,
					opacity: this.props.visible[props.item.id] ? 1 : 0.75,
					marginLeft: props.inset
				})}
				onmouseover={(e) => this.onHover(props.item.id)}
				onmouseleave={(e) => this.onHover(-1)}
			>
				<ImmutableInput placeholder="Name" maxLength="40" value={props.item.name}
					ref={(e) => {
						if (e && props.item.id === context.focus) {
							e.base.focus();
							context.eatFocus();
						}
					}}
					type="text" style={Object.assign({}, Style.text, props.style)}	
					onmouseover={(e) => (e.target.readOnly = true)}
					onclick={(e) => {
						e.target.focus();
					}}
					onchange={(e) => {
						context.Do('Modify' + this.props.type, {
							id: props.item.id,
							name: e.target.value
						});
					}}
				/>
				<div style={{width: "3rem", display: "flex", justifyContent: "flex-end", alignItems: "center"}}>
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
							this.timer = setTimeout(context.Do, 1000, 'Remove' + this.props.type, {id: props.item.id, index: props.index});
						}}
					/>
				: ""}
				&nbsp;
				{(this.state.hover === props.item.id || !this.props.visible[props.item.id]) ?
					<Button img="eye" color={this.props.btnColor} style={Style.hide}
						noOpacity
						onclick={(e) => {
							var o = {};
							e.stopPropagation();
							o[props.item.id] = this.props.visible[props.item.id] ? false : true;
							context.Do('ModifyVisible', o);
						}}
					/>
				: ""}
				</div>
			</div>
		);
	}

	renderFolder(props, context) {
		return (
			<div style={{marginTop: '1px'}}>
				<DropZone 
					style={Object.assign({backgroundColor: '#666', opacity: this.props.visible[props.folder.id] ? '1' : '0.5'}, Style.thread, {padding: '0 0.25rem 0 0'})}
					type={this.props.type}
					effect="move"
					onMouseEnter={(e) => this.setState({hover: props.folder.id})}
					onMouseLeave={(e) => this.setState({hover: -1})}
					onDrop={(from) => this.onMove(from, Object.assign({folder: props.index, index: 0}, props.payload || {}))}
				>
					<div>
					<button
						style={Style.item}
						onclick={() => context.Do('ModifyFolder', {id: props.folder.id, open: !props.folder.open})}
					>
						{props.folder.open ? "-" : "+"}
					</button>
					<ImmutableInput placeholder="Group" maxLength="40" value={props.folder.name}
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
							context.Do('ModifyFolder', {id: props.folder.id, name: e.target.value});
						}}
						onblur={(e) => {
							e.target.readOnly = true;
							e.target.class = "noselect";
						}}
					/>
					</div>
					<div style={{display: "flex", alignItems: "center"}}>
					{(this.state.hover === props.folder.id) ?
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
								this.timer = setTimeout(context.Do, 1000, 'RemoveFolder', {id: props.folder.id, index: props.index, type: this.props.type});
							}}
						/>
					: ""}
					{(this.state.hover === props.folder.id || !this.props.visible[props.folder.id]) ?
						<Button img="eye" color={this.props.btnColor} style={Object.assign({}, Style.hide, {marginRight: '0.75rem'})}
							onclick={(e) => {
								var o = {},
									s = 0;
								e.stopPropagation();

								// hide all if most are visible, else show all
								if (!this.props.visible[props.folder.id]) {
									for (var i in props.folder.items)
										s += this.props.visible[props.folder.items[i]] ? 1 : 0;
									s = (s / props.folder.items.length) > 0.5 ? undefined : true;
								} else s = undefined;
								for (var i in props.folder.items) o[props.folder.items[i]] = s;
								o[props.folder.id] = s;

								context.Do('ModifyVisible', o);
							}}
						/>
					: ''}
					</div>
				</DropZone>
				{props.folder.open ?
					<DragList
						style={Object.assign({}, Style.list, {padding: '0'})}
						type={this.props.type}
						items={props.folder.items}
						onMove={this.onMove}
						payload={{folder: props.index}}
						item={(item, index) => (
							<this.renderItem
								visible={props.visible}
								item={context.Get(item)}
								index={index}
								folder={props.index}
								inset="1rem"
							/>
						)}
					/>
				:''}
			</div>
		);
	}

	onHover(id) {
		this.setState({hover: id});
	}

	onMove(from, to) {
		this.context.Do('Move' + this.props.type, {from, to});
	}

	moveFolder(from, to) {
		var o = Object.assign([], this.props.folders);
		o.splice(to.index, 0, o.splice(from.index, 1)[0]);
		this.context.Do('Modify' + this.props.type + 'Folders', o);
	}
}
module.exports = DragListWithFolders;