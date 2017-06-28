const
	colors = [
		'#666666',
		'#999999',
		'#b21f35',
		'#d82735',
		'#ff7435',
		'#ffa135',
		'#ffcb35',
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

module.exports = {
	palette: colors,
	random: function(color) {
		color = 'hsl(' + (((Math.random() * 30) >> 0) * 12) + ', 75%, 45%)';
		return color;
	}
};