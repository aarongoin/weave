
function AssertionError(message) {
	var e = new Error(message);
	e.name = 'AssertionError';
	return e;
}

function Assert(condition, message) {
	if (condition) return;
	else throw AssertionError(message);
}

function DeepEquals(a, b) {

}

function Pollute() {
		window.Test = Assert;
		window.Assert = Assert;
	}

if (module.exports) module.exports = {
	Test: Assert,
	Assert: Assert,
	pollute: Pollute
};