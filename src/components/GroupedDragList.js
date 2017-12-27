const
React = require('preact'),

Bind = require('../bind.js'),

Draggable = require('./Draggable.js'),
DropZone = require('./DropZone.js'),
DragList = require('./DragList.js'),

Style = {
	list: {
		display: 'flex',
		marginLeft: '1rem'
	},
	draggable: {
		zIndex: 26,
		position: 'relative'
	},
	group: {
		display: 'flex'
	}
};

// groups: [{name, [{item}]}]


function GroupedDragList(props, state, context) {
	return (
		<DragList
			style={Style.group}
			type="groups"
			items={props.groups}
			onMove={this.onMove}
			item={(item, index) => (
				// each item is a group here
				<div>
					<Draggable
						style={Style.draggable}
						type={props.type}
						effect="move"
						payload={index}
					>
						<DropZone
							style={Style.below}
							type={props.type}
							effect="move"
							onDrop={(from) => props.onMove(from, index)}
						>
							{props.header(item, index)}
						</DropZone>
					</Draggable>
					<DragList
						style={Style.list}
						type="groups"
						items={item.map((i) => props.items[i])}
						onMove={this.onMove}
						item={(item, index) => props.item(item, index)}
					/>
				</div>
			)}
		/>
	);
}

/*

EXAMPLE USAGE:
	<GroupedDragList
		type="threads"
		items={listOfThreads}
		blueprint={(item, index) => (
			<div style={{backgroundColor: item.c}}>{item.n}</div>
		)}
	/>

*/

module.exports = GroupedDragList;