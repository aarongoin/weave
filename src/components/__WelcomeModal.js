const
	React = require('preact'),

	ModalView = require('./ModalView.js'),

	Bind = require('../bind.js'),

	Style = {
		span: {
			width: '30rem',
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
			marginBottom: '1rem'
		},
		h1: {
			color: '#000',
			display: 'inline'
		},
		h3: {
			color: '#000',
			display: 'inline',
			fontWeight: '100',
		},
		section: {
			width: '30rem',
			color: '#000',
			fontSize: '1.1rem',
			fontWeight: '400',
			marginBottom: '0.75rem'
		},
		p: {
			marginBottom: '0.75rem'
		},
		warnings: {
			width: '30rem',
			color: '#f00',
			fontSize: '1.1rem',
			fontWeight: '600',
			marginTop: '0.75rem',
			marginBottom: '0.75rem'
		}
	};

class WelcomeModal extends React.Component {
	constructor(props, context) { 
		super(props, context);

		Bind(this);
	}

	render(props, state) {
		const select = this.select;

		return (
			<ModalView
				dismiss={props.onDone}
			>
				<span style={Style.span}>
					<h1 style={Style.h1}>Welcome to Weave</h1><h3 style={Style.h3}>alpha</h3>
				</span>
				<section style={Style.section}>
					<p style={Style.p}>
						Weave is a web app for writers.
					</p>
					<p style={Style.p}>
						Build up the fabric of your story by creating threads for your characters, and laying out scenes in time.
					</p>
					<p style={Style.p}>
						Scaffold your story by summarizing each scene, and setting it's location.
					</p>
					<p style={Style.p}>
						Drag and drop threads and scenes to place them right where you want them.
					</p>
					<p style={Style.p}>
						Write your scenes in a simple, distraction-free text editor.
					</p>
					<p style={Style.p}>
						Click the Project Title Button (in the top-left corner), to access the Project Menu. From here you can modify the Project Title and Author, Import/Export your project, Print your project, or Delete your project and start anew.
					</p>
					<p style={Style.p}>
						The Print Menu allows you to select the threads you wish to print from. Any scenes in selected threads with written words will be auto-selected for printing--along with any Headers. Toggle any scene or header off or on as you wish, and Print when you're ready.
					</p>
				</section>
				<section style={Style.warnings}>
					<p style={Style.p}>
						Weave stores your project inside your browser's Local Storage, so if you clear your browser history and cache: your project may be deleted as well. Be sure to Export your project regularly!
					</p>
					<p style={Style.p}>
						Your browser limits Local Storage by size, so if your project grows to over 1 million written words, you should split it up into seperate projects.
					</p>
				</section>
			</ModalView>
		);
	}
}

module.exports = WelcomeModal;