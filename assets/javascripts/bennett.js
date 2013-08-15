
function getDataFrom(url) {
	return $.get(url)
				.done(function(data, status, xhr) { console.log("Called " + url + ", got status " + xhr.status); })
				.fail(function(e) { console.log(e); });
};
