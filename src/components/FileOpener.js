const
	React = require('preact'),
	Reader = new FileReader();

module.exports = function(props) {
	return (
		<input
			type="file"
			accept=".weave"
			style={{
				position: 'absolute',
				visibility: 'hidden',
				top: '-50',
				left: '-50'
			}}
			onchange={(e) => {
				Reader.onloadend = () => props.onChange(Reader.result);
				Reader.readAsText(e.target.files[0]);
			}}
		/>
	);
}