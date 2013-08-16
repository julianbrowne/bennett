/**
 *	Orphan REST client
**/

Orphan = function(baseURI) {

	this.baseURI = baseURI;
	this.remote = false;
	this.contentType = 'application/json';

	if(!httpServer()) {
		$('body').prepend("<p style='font-weight: bold; color: red;'>Warning: Orphan must be run from behind an HTTP server</p>");
		throw Orphan.Error.CreateClientFailedError;
	}

	function httpServer() {
		return (location.protocol=="https:" || location.protocol=="http:")
	}

}
	
Orphan.prototype.request = function(resourceURI, displayFunction, method)
{
	var method = method || 'get';
	
	this[method.toLowerCase()](resourceURI, displayFunction);

}

Orphan.prototype.get = function(resourceURI, handler) {

	var url = (this.baseURI + resourceURI).replace(/([^:])\/\//g, "$1\/");

	$.get(url)
		.done(handler)
		.fail(this.reportError(resourceURI));
}

Orphan.prototype.delete = function(resourceURI, displayFunction, contentType)
{
	var params = { type: 'delete', success: displayFunction, error: this.reportError };

	if (contentType === undefined)
		params.contentType = this.contentType;
	else
		params.contentType = contentType;
	
	params.url = (this.baseURI + resourceURI).replace(/([^:])\/\//g, "$1\/");

	$.ajax(params);
}

Orphan.prototype.put = function(resourceURI, newRepresentation, displayFunction, contentType)
{
	var params = { type: 'put', success: displayFunction, error: this.reportError, data : newRepresentation };

	if (contentType === undefined)
		params.contentType = this.contentType;
	else
		params.contentType = contentType;
	
	params.url = (this.baseURI + resourceURI).replace(/([^:])\/\//g, "$1\/");

	$.ajax(params);
}

Orphan.prototype.post = function(resourceURI, displayFunction)
{
	var params = {};

	params.type    = 'post';
	params.success = displayFunction;
	params.error   = this.reportError;
	params.url     = (this.baseURI + resourceURI).replace(/([^:])\/\//g, "$1\/");

	$.ajax(params);
}

Orphan.prototype.reportError = function(url) {
	return function(xhr, textStatus, errorThrown) {
		console.log("*** Error calling " + url);
		console.log(xhr);
		console.log(textStatus);
		console.log(errorThrown);
	};
};

Orphan.prototype.extract = function(data, extractor)
{
	var html = '';
	var commands = extractor.commands;
	
	if(!commands || commands.length == 0)
		return html;
	
	for(i in commands)
	{
		var values = jsonPath(data, commands[i].selector);
		
		if(!values) next;

		if(values.length==1)
			var value = values[0];
		else
			var value = values;

		if(commands[i].template)
		{
			var model = {};
			model.name = commands[i].name;
			model.value = value;

			html += Orphan.utils.templatedElement(commands[i].template, model);
		}
		else
			html += '<p>' + commands[i].name + ' : ' + value.toString() + '</p>';

	}

	return html;
}

Orphan.Error = {

	CreateClientFailedError : { name: 'CreateClientFailed', message: 'Not running on HTTP server'}
	
}
