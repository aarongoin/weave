function mapTimes(time) { // time : { ...timeKey: timeValue} => { times: { ...timeKey: offset }, oldest: oldestTime, newest: newestTime }
	var result = { times: {}, offset: 3},
		times = Object.keys(time).sort(),
		cur,
		prev = time[times[0]],
		i = 0;

	result.times[times[0]] = 3;

	while (++i < times.length) {
		// get current time value
		cur = time[times[i]];
		// calculate offset
		result.offset += Math.min(Math.max(Math.sqrt(cur - prev) / 64, 0), 120) + 4.5;
		result.times[times[i]] = result.offset;
		prev = cur;
	}
	result.newest = prev;
	return result;
}

const MapModel = {
	Scenes: function(scenes, locations, visible, search, project) {
		var result = {scenes: {}, times: {}, threads: {}},
			search = search.toLowerCase(),
			locationList, v, path, direct, temp;

		for (var i in project.locationList) {
			if (visible[project.locationList[i]]) result.scenes[project.locationList[i]] = [];
		}
		for (var f in project.locationFolders) {
			project.folder[project.locationFolders[f]].items.forEach((i) => {
				if (visible[i]) result.scenes[i] = [];
			});
		}

		locationList = Object.keys(result.scenes);

		Object.keys(scenes).map((id) => {
			var scene = scenes[id],
				threadIDs = Object.keys(scene.thread),
				v = false, i = -1, path;

			if (visible[scene.location]) {

				// does scene have at least one visible thread? Or no threads?
				if (threadIDs.length) {
					while (++i < threadIDs.length) {
						if (visible[threadIDs[i]]) {
							path = result.threads[threadIDs[i]] = result.threads[threadIDs[i]] || [];
							path.push([locationList.indexOf(scene.location), scene.utctime, i * 1.5]);
							v = true;
						}
					}
				} else v = true;
				// and contains search text
				if (v && (search === '' || scene.summary.toLowerCase().includes(search) || scene.body.toLowerCase().includes(search))) {
					result.times[scene.utctime] = result.times[scene.utctime] || (Date.parse(scene.utctime) / 60000);
					result.scenes[scene.location].push(scene);
				}
			}
		});

		for (var t in result.threads) {
			v = Object.keys(project.thread[t].time);
			v.sort((a, b) => (Date.parse(a) > Date.parse(b)));
			path = result.threads[t];
			path.sort((a,b) => (Date.parse(a[1]) > Date.parse(b[1])));
			i = path.length;
			temp = [];
			direct = [];
			if (i === 1) result.threads[t] = [['normal', path]];
			else while (i--) {
				if (i > 0) {
					if (v.indexOf(path[i][1]) - v.indexOf(path[i-1][1]) === 1) {
						if (direct[0] !== path[i]) direct.unshift(path[i]);
						direct.unshift(path[i-1]);
					} else {
						direct.unshift('normal');
						temp.unshift(direct);
						direct = [];
						temp.unshift(['dashed', path[i-1], path[i]])
					}
				}
			}
			if (direct.length) {
				direct.unshift('normal');
				temp.unshift(direct);
			}
			result.threads[t] = temp;
		}

		for (var loc in result.scenes) result.scenes[loc].sort((a, b) => (Date.parse(a.utctime) > Date.parse(b.utctime)));

		return Object.assign(result, mapTimes(result.times));
	},

	Notes: function(notes, visible, search) {
		var result = [];

		Object.keys(notes).map((id) => {
			var note = notes[id],
				i = -1;
			for (i in note.tag) if (!visible[i]) return;

			if (search === '' || note.body.toLowerCase().includes(search)) result.push(note);
		});

		return result;//.sort((a, b) => ( a.modified < b.modified ));
	}
};

module.exports = MapModel;