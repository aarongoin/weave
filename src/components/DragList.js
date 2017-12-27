const
React = require('preact'),

Bind = require('../bind.js'),

Draggable = require('./Draggable.js'),
DropZone = require('./DropZone.js'),

Style = {
	list: {
		display: 'flex',
	},
	draggable: {
		zIndex: 26,
		position: 'relative'
	}
};

function DragList(props, state, context) {
	return (
		<ol style={Object.assign(props.style || {}, Style.list)}>
			{(props.items.map((item, index) => (
				<Draggable
					style={Style.draggable}
					type={props.type}
					effect="move"
					payload={Object.assign({id: item, index}, props.payload || {})}
					onDragStart={(e) => {
						e.cancelBubble = true;
					}}
				>
					<DropZone
						type={props.type}
						effect="move"
						onDrop={(from) => props.onMove(from, Object.assign({index}, props.payload || {}))}
					>
						{props.item(item, index)}
					</DropZone>
				</Draggable>
			))).concat([
				<DropZone
						style={{height: '1rem'}}
						type={props.type}
						effect="move"
						onDrop={(from) => props.onMove(from, Object.assign({index: props.items.length}, props.payload || {}))}
				>&nbsp;</DropZone>
			])}
		</ol>
	);
}

/*

EXAMPLE USAGE:
	<DragList
		type="threads"
		items={listOfThreads}
		item={(item, index) => (
			<div style={{backgroundColor: item.c}}>{item.n}</div>
		)}
	/>

*/

module.exports = DragList;