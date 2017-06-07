const
	colors = [
		'#000000',
		'#333333',
		'#666666',
		'#999999',
		'#b21f35',
		'#d82735',
		'#ff7435',
		'#ffa135',
		'#ffcb35',
		'#fff735',
		'#00753a',
		'#009e47',
		'#16dd36',
		'#0052a5',
		'#0079e7',
		'#06a9fc',
		'#681e7e',
		'#7d3cb5',
		'#bd7af6'
	];

module.exports = function(old) {
	var i = colors.indexOf(old);

	return colors[++i === colors.length ? 0 : i];
}