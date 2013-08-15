
function getDataFrom(url) {
	return $.get(url)
				.done(function(data, status, xhr) { console.log("Called " + url + ", got status " + xhr.status); })
				.fail(function(e) { console.log(e); });
};

function logAction(message) {
	var date = new Date();
	var timestamp = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + ":" + date.getMilliseconds();
	$("#test-log").append("<li><span style='color: #A52E01'>" + timestamp + "</span>: " + message + "</li>");
}
