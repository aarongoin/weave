const
	React = require('preact'),
	Bind = require('./bind.js');

class AnimatedComponent extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.AnimateUnmount = new Promise((resolve, reject) => {
			const ev = (e) => {
				this.base.removeEventListener('transitionend', ev);
				resolve();
			}
			this.base.addEventListener('transitionend', ev);
			this.onUnmount(this.base);
		});


		Bind(this);
	}

	async componentDidMount() {
		return await this.onMount(this.base);
	}

	async componentWillUnmount() {
		return await this.AnimateUnmount();
	}

	/* EXTEND WITH FOLLOWING:

	onMount(base) {
	
	}

	onUnmount(base) {
	
	}

	*/
}

module.exports = AnimatedComponent;