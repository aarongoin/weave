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
],
threadColors = [],
locationColors = [];

var i = 0;
while (i < 360) {
	threadColors.push('hsl(' + i + ', ' + '100%, ' + '40%)');
	locationColors.push('hsl(' + i + ', ' + '20%, ' + '20%)');
	i += 10;
}

module.exports = {
	Location: locationColors,
	Thread: threadColors,
	threadColor: function(color) {
		return threadColors[(Math.random() * threadColors.length) >> 0];
	},
	locationColor: function(color) {
		return locationColors[(Math.random() * locationColors.length) >> 0];
	},
	next: function(color, i) {
		i = threadColors.indexOf(color);
		if (i !== -1) return threadColors[++i === threadColors.length ? 0 : i];

		i = locationColors.indexOf(color);
		if (i !== -1) return locationColors[++i === locationColors.length ? 0 : i];
	}
};