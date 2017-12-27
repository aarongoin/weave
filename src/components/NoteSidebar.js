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
		margin: '1px 0.25rem',
		backgroundColor: '#eee',
		border: '1px solid #222',
		boxShadow: '0 0 0.25rem #111'
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
		margin: '0 0.8rem 0 0.8rem',
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
		padding: '0.3rem 0.5rem',
		top: '-0.25rem',
		left: '1rem',
		color: '#fff',
		borderRadius: '1rem',
		whiteSpace: 'nowrap'
	},
	sidebar: {
		zIndex: 50,
		position: 'fixed',
		width: '28rem',
		top: 0,
		bottom: 0,
		border: '1px solid #000',
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

		props.register(() => this.setState({toggled: !this.state.toggled}));

		this.state = {
			toggled: true,
			hover: -1
		}

		Bind(this);
	}

	render(props, state, context) {
		return (
			<div><div style={Object.assign({width: state.toggled ? '28.1rem' : 0}, Style.spacer)}>&nbsp;</div>
			<SidebarItem
				style={Object.assign({right: state.toggled ? 0 : '-28.5rem'}, Style.sidebar)}
				buttons={[
					<Button
						img="add"
						color="#fff"
						onclick={(e) => {
							this.context.Do('CreateNote');
						}}
						style={Style.item}
					/>,
					<Button
						img="note"
						color="#fff"
						noOpacity={true}
						style={Style.item}
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
								{Object.keys(item.tag).map((i) => (
									<div style="position: relative; border-radius: 1rem;" class="tooltip">
										<Button
											img="delete"
											color={context.Get(i).color}
											style={Object.assign({}, Style.item, {backgroundColor: context.Get(i).color, margin: '0 0.25rem 0 0', borderRadius: '0.5rem'})}
											onclick={(e) => {
												if (this.timer) {
													clearTimeout(this.timer);
													this.timer = undefined;
												}
											}}
											onmouseenter={(e) => e.currentTarget.style.backgroundColor = 'inherit'}
											onmouseleave={(e) => e.currentTarget.style.backgroundColor = context.Get(i).color}
											onclick={() => {
												var o = {id: item.id, tag: {}};
												o.tag[i] = undefined;
												context.Do('ModifyNote', o);
											}}
										/>
										<div
											class="tooltipText"
											style={Object.assign({backgroundColor: context.Get(i).color}, Style.tooltip)}
										>
											{context.Get(i).name}
										</div>
									</div>
								))}
							</div>
							<ExpandingTextarea
								style={Style.text}
								//maxLength={250} 
								onInput={(e) => context.Do('ModifyNote', { id: item.id, body: e.target.value })} 
								baseHeight="1rem"
								placeholder="Note"
								value={item.body}
								//onFocus={this.onFocus}
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