// match and capture 1: year, 2: AD variant, 3: BC variant
const day = "(?:\\W*(\\d\\d?)\\s?(?:st|nd|rd|th)?)";
const season = "(?:\\W*(Spring)|(Summer)|(Fall)|(Winter))";
const month = "(?:\\W*((?:Jan\\w*)|i)|((?:Feb\\w*)|ii)|((?:Mar\\w*)|iii)|((?:Apr\\w*)|iv)|((?:May\\w*)|v)|((?:Jun\\w*)|vi)|((?:Jul\\w*)|vii)|((?:Aug\\w*)|viii)|((?:Sep\\w*)|ix)|((?:Oct\\w*)|x)|((?:Nov\\w*)|xi)|((?:Dec\\w*)|xii)[.,]?)";
const year = "(?:\\W*\\b(\\d{1,4})\\s*?(?:(AD|A\\.D\\.|CE|C\\.E\\.)|(BCE?|B\\.C\\.(?:E\\.)?))?)";
const time = "(?:[ ./\\-T](\\d\\d?)(?:\\W?[:./h\\-]\\W?(\\d\\d))?\\W?(pm|Pm|PM|pM)?)?"
const YMD = "(\\d{4})[./\\-](\\d\\d?)(?:[./\\-](\\d\\d?))?";
const DMY = "(?:(\\d\\d?)[./\\-])?(\\d\\d?)[./\\-](\\d{2,4})";

// checkList contains array of regexp and handler function pairs
const checkList = [

/* YEAR MONTH DAY */
	["YYYY.MM(.DD) (HH(.MM))", new RegExp(YMD + time, "i"), function(match) {
		var result = "";

		result += match[1]; // year
		result += "-" + match[2]; // month
		result += match[3] ? (match[3].length === 1 ? "-0" : "-") + match[3] : "-01"; // day
		if (match[6]) {
			result += match[4] ? "T" + Number(Number.parseInt(match[4], 10) + 12).toString() : "T00"; // hour
		} else {
			result += match[4] ? (match[4].length === 1 ? "T0" : "T") + match[4] : "T00"; // hour
		}
		result += match[5] ? ":" + match[5] : ":00"; // minute
		result += ":00Z"; // seconds

		return result;
	}],
/* DAY MONTH YEAR */
	["(DD.)MM.(YY)YY (HH(.MM))", new RegExp(DMY + time, "i"), function(match) {
		var result = "";

		result += match[3].length === 2 ? "20"+ match[3] : match[3]; // year
		result += "-" + match[2]; // month
		result += match[1] ? (match[1].length === 1 ? "-0" : "-") + match[1] : "-01"; // day
		if (match[6]) {
			result += match[4] ? "T" + Number(Number.parseInt(match[4], 10) + 12).toString() : "T00"; // hour
		} else {
			result += match[4] ? (match[4].length === 1 ? "T0" : "T") + match[4] : "T00"; // hour
		}
		result += match[5] ? ":" + match[5] : ":00"; // minute
		result += ":00Z"; // seconds

		return result;
	}],
/* SEASONAL or MONTH DAY YEAR */
	["(SS)|(MMM.(DD)).YYYY (HH(.MM))", new RegExp("(?:" + season + "|(?:" + month + day + "?[,.]?))?" + year + time, "i"), function(match) {
		var result = "";

		// parse year
		if (match[20]) result += "-";
		result += match[18] + "-";

		// parse month from season (or default to january)
		if (match[1]) result += "04";
		else if (match[2]) result += "07";
		else if (match[3]) result += "10";
		else if (match[4]) result += "01";
		// else parse month itself
		else for (var i = 5; i < 17; i++) {
			if (match[i] !== undefined) {
				result += (i < 14 ? "0" : "") + (i - 4);
				break;
			}
			if (i === 16) result += "01";
		}

		// parse day
		if (match[17] !== undefined) {
			result += (match[17] < 10 ? "-0" : "-") + match[17];
		}
		else result += "-01";

		if (match[23]) {
			result += match[21] ? "T" + Number(Number.parseInt(match[21], 10) + 12).toString() : "T00"; // hour
		} else {
			result += match[21] ? (match[21].length === 1 ? "T0" : "T") + match[21] : "T00"; // hour
		}
		result += match[22] ? ":" + match[22] : ":00"; // minute
		result += ":00Z"; // seconds

		return result;
	}],
];

module.exports = function ParseTime(timeString) {
	// Map arbitrary Date/Time Strings to ISO 8601 combined date and time in UTC 
	// ex. "May 1st, 2011" => "2011-05-01T00:00:00Z"
	// ex. "Spring 1476" => "1476-04-01T00:00:00Z"
	var result = {
			type: "",
			isValid: false,
			ISOString: (new Date()).toISOString()
		},
		match;

	for(var i = 0; i < checkList.length; i++) {
		match = checkList[i][1].exec(timeString);
		if (Array.isArray(match)) {
			result.type = checkList[i][0];
			result.ISOString = checkList[i][2](match);
			// if (i !== 0) {
			// 	// move this date format to top of list
			// 	// this is a naive optimization that assumes user will stick to a single/handful style(s) for writing dates
			// 	// and allows for more explicit and easily debuggable regular expression
			// 	checkList.unshift(checkList.splice(i, 1)[0]);
			// }
			if (!isNaN(Date.parse(result.ISOString)))
				result.isValid = true;

			return result;
		}
	}
	return result;
};