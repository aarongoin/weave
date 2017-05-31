const
	React = require('preact'),

	Bind = require('../bind.js'),

	SliceView = require('./SliceView.js'),
	WeaveHeaders = require('./WeaveHeaders.js'),
	WeaveBackground = require('./WeaveBackground.js'),

	Style = {
		weave: {
			marginTop: '5rem',
			marginLeft: '7rem',
			display: 'inline-flex'
		},
		slices: {
			display: 'flex',
			justifyContent: 'flex-start',
			alignItems: 'flex-start'
		}
	};
 

module.exports = function(props, state) {
	return (
		<div style={Style.weave}>
			<WeaveHeaders
				slices={props.slices}
				locations={props.locations}
			/>
			<WeaveBackground
				slices={props.slices.length}
				locations={props.locations.length}
			/>
			<div data-is="Weave" style={Style.slices}>
				{props.slices.map((slice, i) =>
					<SliceView
						id={i}
						slice={slice}
						threads={props.threads}
						editFunc={props.editNote}
					/>
				)}
			</div>
		</div>
	)
}