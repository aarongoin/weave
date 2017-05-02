const
	React = require('preact'),

	Style = {
		outer: {
			marginTop: '3rem',
			zIndex: '-5',
			position: 'absolute',
			left: '0',
			top: '0',
			opacity: '0.3'
		},
		div: {
			marginTop: '12rem',
			height: '2rem'
		}
	};

module.exports = function(props) {
	var threads = [],
		i = -1;

	while (++i < props.threads.length) threads.push(
		<div style={Object.assign(Style.div, { backgroundColor: props.threads[i].color })}>&nbsp;</div>
	);

	return (
		<div data-is="ThreadView" style={Object.assign(Style.outer, { width: props.width })}>
			{threads}
		</div>
	)
};