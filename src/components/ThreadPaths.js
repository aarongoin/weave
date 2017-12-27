const
	React = require('preact'),

	Bind = require('../bind.js'),

	Style = {
		svg: {
			//zIndex: 50,
			position: 'absolute',
			top: '0.25rem',
			left: '2.25rem',
			pointerEvents: 'none',
			//opacity: '0.75'
		}
	};



class ThreadPaths extends React.Component {
	constructor(props, context) {
		super(props, context);

		Bind(this);
	}

	render(props, state, context) {
		return (
			<svg
				style={Object.assign({width: (props.width - 2.7) + 'rem', height: props.height + 'rem'}, Style.svg)}
				x="0px"
				y="0px"
				viewBox={"0 0 " + (props.width - 2.7) + " " + props.height}
			>
				{Object.keys(props.threads).map((id) => {
					var thread = context.Get(id);
					return (
						<g>
							{props.threads[id].map((section) => this.renderSection(thread, section))}
						</g>
					);
				})}
			</svg>
		)
	}

	renderSection(t, section, f) {
		return (
			<path
				stroke-dasharray={(f !== undefined) ? '0.5 2.2' : section[0] === 'normal' ? '1 0' : '0.5 0.4'}
				fill="transparent"
				stroke-width="0.3"
				stroke={f ? f : t.color}
				d={section.reduce((path, coord, i) => {
					var x0, y0, prev, mx, my, x1, y1;
					if (typeof coord === 'string') return path;

					x1 = (coord[0] * 20.5 + coord[2]);
					y1 = this.props.times[coord[1]];
					if (i === 1) return path + "M" + (x1 + 0.25) + "," + (y1 + 0.25);
					else {
						prev = section[i - 1];
						x0 = (prev[0] * 20.5 + prev[2]);
						y0 = this.props.times[prev[1]];
						mx = (x0 + (x1 - x0) / 2);
						my = (y0 + (y1 - y0) / 2);
						if (Math.abs(x1 - x0) < 5) return (path + "L" + (x1 + 0.25) + "," + (y1 + 0.25));
						else return (path +
							"Q" + (x0 + 0.25) + " " + (my + 0.25 + coord[2]) + "," + (mx + 0.25) + " " + (my + 0.25 + coord[2]) +
							"Q" + (x1 + 0.25) + " " + (my + 0.25 + coord[2]) + "," + (x1 + 0.25) + " " + (y1 + 0.25)
						);
					}
				}, "")}
			/>
		);
	}
}

module.exports = ThreadPaths;