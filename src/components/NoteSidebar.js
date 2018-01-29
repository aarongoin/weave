const
React = require('preact'),

Bind = require('../bind.js'),

Colors = require('../colors.js'),
DropZone = require('./DropZone.js'),
SidebarItem = require('./SidebarItem.js'),
ExpandingTextarea = require('./ExpandingTextarea.js'),
ScrollingView = require('./ScrollingView.js'),
Button = require('../buttons.js'),

Style = {
	text: {
		width: '100%',
		border: 'none',
		outline: 'none',
		backgroundColor: '#eee',
		fontSize: '1.1rem',
		color: '#000'
	},
	tags: {
		color: '#666',
		fontSize: '0.8rem',
		marginBottom: '0.5rem',
		display: 'flex'
	},
	note: {
		position: 'relative',
		display: 'flex',
		padding: '0.5rem',
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'stretch',
		fontSize: '1.2rem',
		margin: '0.25rem 0.25rem',
		backgroundColor: '#eee',
		borderRadius: "0.15rem"
		//border: '1px solid #222',
		//boxShadow: '0 0 0.25rem #111'
	},
	hide: {
		cursor: 'pointer',
		marginRight: '1rem',
		width: '1rem',
		height: '1rem'
	},
	list: {
		flexDirection: 'column',
		padding: '0 0.3rem'
	},
	item: {
		margin: '0 0.5rem 0 0.5rem',
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
	delete: {
		position: 'absolute',
		top: '0.5rem',
		right: '0.5rem',
		width: '1rem',
		height: '1rem',
		cursor: 'pointer',
		backgroundColor: 'inherit'
	},
	tooltip: {
		zIndex: 100,
		position: 'absolute',
		padding: "0.25rem 0.5rem",
		borderRadius: "0.5rem",
		top: '-0.25rem',
		left: '1rem',
		color: '#fff',
		whiteSpace: 'nowrap'
	},
	sidebar: {
		zIndex: 49,
		position: 'fixed',
		width: '27.75rem',
		top: 0,
		bottom: 0,
		//border: '1px solid #000',
		transition: 'right 0.3s ease-in-out'
	},
	spacer: {
		height: '100vh',
		transition: 'width 0.3s ease-in-out'
	}
};

class NoteSidebar extends React.Component {
	constructor(props, context) {
		super(props, context);


		this.state = {
			hover: -1
		}

		Bind(this);
	}

	render(props, state, context) {
		return (
			<div><div style={Object.assign({width: props.toggled ? '28.1rem' : 0}, Style.spacer)}>&nbsp;</div>
			<SidebarItem
				style={Object.assign({right: props.toggled ? 0 : '-28.5rem'}, Style.sidebar)}
				buttons={[
					<Button
						img="add"
						color="#444"
						hoverColor="#000"
						onclick={(e) => {
							this.context.Do('CreateNote');
						}}
						style={Style.item}
					/>,
					<Button
						img="note"
						color="#000"
						noOpacity={true}
						style={Style.item}
						text="Notes"
					/>
				]}
			>
				<ScrollingView
					style={{
						width: '100%',
						flexGrow: 1,
						minHeight: '1rem'
					}}
				>
					{props.notes.map((item, index) => (
						<DropZone
							key={item.id}
							type={["Thread", "Location"]}
							style={Style.note}
							onMouseEnter={() => this.setState({ hover: index })}
							onMouseLeave={() => this.setState({ hover: -1 })}
							onDrop={({id}) => {
								var o = {id: item.id, tag: {}};
								o.tag[id] = true;
								context.Do('ModifyNote', o);
							}}
						>
							<div
								style={Style.tags}
							>
								{Object.keys(item.tag).map((i) => {
									var tag = context.Get(i),
										color = tag.color;
									return (
										<div style="position: relative; border-radius: 1rem; background-color: rgba(0,0,0,0);" class="tooltip">
											<Button
												noOpacity
												img="delete"
												color={color}
												style={Object.assign({}, Style.item, {backgroundColor: color, margin: '0 0.25rem 0 0', borderRadius: '0.5rem'})}
												onclick={(e) => {
													if (this.timer) {
														clearTimeout(this.timer);
														this.timer = undefined;
													}
												}}
												onmouseenter={(e) => e.target.firstChild.style.backgroundColor = 'rgba(0,0,0,0)'}
												onmouseleave={(e) => e.target.firstChild.style.backgroundColor = color}
												onmousedown={() => {
													var o = {id: item.id, tag: {}};
													o.tag[i] = undefined;
													this.timer = setTimeout(context.Do, 1000, 'ModifyNote', o);
												}}
											/>
											<div
												class="tooltipText"
												style={Object.assign({backgroundColor: color}, Style.tooltip)}
											>
												{tag.name}
											</div>
										</div>
									);
								})}
							</div>
							<ExpandingTextarea
								style={Style.text}
								//maxLength={250} 
								oninput={(e) => context.Do('ModifyNote', { id: item.id, body: e.target.value })} 
								baseHeight="1rem"
								placeholder="Note"
								value={item.body}
								//onfocus={this.onFocus}
								ref={el => this.el = el}
							/>
							{(state.hover === index) ?
								<Button
									img="delete"
									color="#000"
									hoverColor="#c30"
									style={Style.delete}
									onclick={(e) => {
										if (this.timer) {
											clearTimeout(this.timer);
											this.timer = undefined;
										}
									}}
									onmousedown={(e) => {
										this.timer = setTimeout(context.Do, 1000, 'DeleteNote', item.id);
									}}
								/>
							: ""}
						</DropZone>
					))}
				</ScrollingView>
			</SidebarItem>
			</div>
		);
	}
}

module.exports = NoteSidebar;