
## Bennett

Bennet is a simple javascript data-driven REST API verification tool. You describe the behavioural characteristics of an API, provide some sample test data and the combination of API calls that make up each test case and Bennett does the rest.

### Dependencies

All dependencies are included but they are:

*	JQuery        v2.0.3  (DOM manipulation)  
*	JQuery UI     v1.10.3 (Tabs)  
*	TheGrid       v0.0.1  (Jenkins-like grid layout)  
*	JS-Yaml       v2.1.0  (for reading and parsing the config files)  
*	Piggybank     v0.0.1  (managing ajax calls synchronously)  
*	Uritemplate   v0.3.4  (mashing uri templates and fixture data)  

### Design

Bennet reads three YAML files and creates three javascript object structures (api definition, fixture data, test cases). Bennet then iterates through the test cases applying the required API definition and fixture data to each.

For example, if the test case was to log in and then log out, then Bennett reads the log in definition, applies the username and password to the defined API uri template, makes the call, checks the response against what's expected, then does the same with the log out call.

Calls are made synchronously using the [piggybank](https://github.com/julianbrowne/piggybank) javascript library and the result set is collated and displayed on screen using [thegrid](https://github.com/julianbrowne/thegrid).

![screen-shot](https://raw.github.com/julianbrowne/bennett/master/assets/images/screen-shot.png)

### Configuration

#### API Definition

All Bennett configuration is defined using YAML files of the form

	container:
	
		sub_container:
		
			api_name:
				api_feature: value
				api_feature: value
			
			api_name:
				api_feature: value
				api_feature: value
			
		sub_container:
		
				...

The container/sub-container keys are optional and may be arbitrarily deep, though they're useful for classifing large API domains.

A simple API spec might look like this:

	update_user:
  		desc: "Update user resource with a POST"
  		url: "/users/{userid}"
  		method: post
  		response: 200
  		body: user_details

**update\_user**: This name this API must be referred to by in other files  
**desc**: The user friendly tag that will be used to record the results of calls to this API  
**url**: The URI, or URI template, that defines this URI's endpoint  
**method**: The HTTP verb used for this call ("get", "post", "put", "delete")  
**response**: The expected response from this API call  
**body**: A reference to the fixture data needed for this API call in the HTTP request body  

Other keys valid here are:

**schema**:   JSON schema that defines the expected return data  
**encoding**: Encoding to use for post and put request body data. By default these are just sent as json objects, but to simulate a form being posted, for example, this should be set to 'form'  
**headers**:  HTTP headers to be send with the request
**remember**: Name tag applied to returned data which can be accessed by subsequent calls. e.g.

	log_in:
		url: /session
		method: post
		body: user_details
		remember: session
		headers:
			client: client_app_name
		schema: { "ApiSession": { "type": "string" } }
		response: 201

	get_account_details:
		url: /user/{user_details.username}
		method: get
		headers:
			client: client_app_name
			ApiSession: session.APiSession
		response: 200  

Data required to run this:  

	user_details:
		username: "fred"
		password: "freds_secret"

	client_app_name: "Bennett API Verifier"

On calling the log\_in api the HTTP payload will be:  

	POST /session
	client: "Bennett API Verifier"

The returned data should look something like this:  

	{ "ApiSession": "ABC123XYZ" }

Which will be verified against the response code (201), the JSON schema, and then stored for later calls to access as:  

	session.ApiSession: "ABC123XYZ"

So the second call will be:

	GET /user/fred
	client: "Bennett API Verifier"
	ApiSession: "ABC123XYZ"

Which will be verified against the response code (200)	

#### Data Definition

Any data requirements defined in the API config file by body, parameters or URI templates, must be catered for in the test data. The example above requires a userid for the endpoint call "/users/{userid}" and some data for the request body defined in the spec as "user\_details".

	root: "http://127.0.0.1"
	userid: 42
	user_details:
    	name: "fred"

**root:** The root/stub address of the API that all API calls will be appended to. In this case Bennett will be calling "http://127.0.0.1/users/{userid}"  
**userid:** The value to interpolate into the URI template, making the actual call now "http://127.0.0.1/users/42". Bennett uses [URI Template JS](https://github.com/fxa/uritemplate-js) for this making it fully [RFC6570](http://tools.ietf.org/html/rfc6570) compliant.

#### Test Scenarios

With an API spec and some data to enrich it the last piece of the puzzle is some test scenrios (journeys) to exercise the API in meaningful ways.

Scenarios look like this:

	scenario_name:
		- api_call
		- api_call
		- api_call
	
	scenario_name:
		- api_call
		- api_call
		- api_call

Test cases are executed in order with each API call waiting for the last one to complete before it begins.  

References to API calls may optionally contain overrides for parts of the API specification. This is to allow for "expected failures" where an unhappy-path needs to be tested but it doesn't make sense to call an expected failure an actual failure. For example, a GET for a known user at /users/42 might be expected to return a 200 and some data whereas the same GET for /users/99 might be expected to return a 404. All API settings are valid inside scenarios like this:

	scenario_name:
		- api_call
		- api_call:
			return: 404
			desc: "expect to get not found response"
		- api_call

### Install and Run

	TODOC

#### Installation

	TODOC

	git clone https://github.com/julianbrowne/bennett.git
	
#### Running

Simply put the bennett install directory behind a decent HTTP server such as Apache with a config like:

	<VirtualHost 127.0.0.1:80>
    	DocumentRoot /path/to/bennett
	</VirtualHost>

#### Start Testing

The index.html file in the Bennett root directory sets up and runs the tests. The lines to change look something like this:

	var dataUrl = "/spec/selftest/data.yml";
	var specUrl = "/spec/selftest/api.yml";
	var testUrl = "/spec/selftest/tests.yml";

	var harness = new Bennett(dataUrl, specUrl, testUrl);

	harness.runTests();

To get started Bennett requires that the three data files are created, then defined (by their URL location, not file system) and passed to a new Bennett() object;

To initiate the test cycle call runTests() on the created object.

Refreshing the web page that points to index.html will re-run the tests.

