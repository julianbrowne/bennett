
# Bennett

Bennet is a simple javascript data-driven REST API verification tool.   

Bennett requires three sets of data to be able to run its verification process. These are provided as YAML files. They are:   

*	API Spec: The behavioural characteristics of the API
*	Fixture Data: Some sample test data with which to populate the API calls
*	Scenarios: A series of API call combinations that make up each test case

![screen-shot](https://raw.github.com/julianbrowne/bennett/master/assets/images/screen-shot.png)

## Dependencies

All dependencies are included but they are:

*	JQuery        v2.0.3  (DOM manipulation)  
*	JQuery UI     v1.10.3 (Tabs)  
*	[TheGrid](https://github.com/julianbrowne/thegrid)       v0.0.1  (Jenkins-like grid layout)  
*	JS-Yaml       v2.1.0  (for reading and parsing the config files)  
*	[Piggybank](https://github.com/julianbrowne/piggybank)     v0.0.1  (for managing ajax calls synchronously)  
*	Uritemplate   v0.3.4  (mashing uri templates and fixture data)  

## Basic Configuration

Here's a quick introduction to the YAML data definition concepts Bennett expects. All tags and their usage is described in details later.

### API Spec

An API spec is a sequence of definitions for each endpoint in the target API. These can be nested for ease of reading. e.g.  

	my_api_spec:
		session:
			login:
		  		desc: "Login to the service"
		  		url: "/session"
		  		method: post
		  		body: some_user_data
		  		remember: session_data
		  		response: 201
			logout:
		  		desc: "Logout of the service"
		  		url: "/session/{session_id}"
		  		urldata:
		  			recall: session_data
		  		method: delete
		  		response: 201

This defines two API calls: login and logout. Each has a description (desc), a url, an HTTP method and an expected HTTP response defined. Additionally the login definition will populate its POST body with some fixture data (see below) and it will also "remember" any data (e.g. JSON) in a session structure called _session\_data_. This is then "recalled" by logout to populate the uri template defined for the url. In this case Bennett will look for a variable within the _session\_data_ object called _session\_id_

### Fixture Data

Populating the above example requires that the POST for login has some body data to work with. The key "body" is defined as _some\_user\_data_ Bennett will look for this in the fixture file and automaically construct the HTTP post with it:

	some_user_data:
		username: "bob"
		password: "bobs_secret_password"

### Scenarios

A simple scenario might be a call to login followed by a call to logout.

	login_then_logout:
		- my_api_spec.session.login
		- my_api_spec.session.logout

Note that any nesting of API definitions in the API spec must be mirroed in the scenario file. It's useful to be able to override the expected HTTP return code of an API to test deliberate failure scenarios. For example, if logout were to be called without a pior login (i.e. no valid session resource to delete) then the API might be expected to return a 400 instead of a 201. All API definitions are overridable within a specific scenario. e.g.  

	logout_without_login:
		- my_api_spec.session.logout:
			desc: "expect to fail a logout with no active session"
			response: 400

## Installation

Put the Bennett files into local directory, e.g.  

	git clone https://github.com/julianbrowne/bennett.git

Then access via a suitable web server such as Apache with a config like:

	<VirtualHost 127.0.0.1:80>
    	DocumentRoot /path/to/bennett
	</VirtualHost>


### Running Tests

Once the three files have been created a Bennett test run can be initiated like so:   

	var bennett = new Bennett(url_to_data_file, url_to_api_file, url_to_scenarios_file);	// instantiate test harness
    bennett.targetElement("#test-results");													// DOM element to put results in
    bennett.runTests();																		// do it

This can be found in the _index.html_ file in the root of the Bennett install directory.

## Cross-Site Rules

Bennett runs in a browser and uses JQuery to make ajax calls to the API under test. This means [cross-site scripting](http://en.wikipedia.org/wiki/Cross-site_scripting) rules are in effect. Cross-site limitations stop a browser from extracting data from other sites that are not in the same domain as the originator (unless included in the page's source as loaded from the web server). A domain is made up of a protocol (http|https) a name (example.com) and a port (80:8080). Usually Bennett will be running on a different machine or port to that on which the API is hosted. To make Bennet work both Bennett and the API will need to be hosted behind a proxy that makes both appear to the browser as if they are within the same domain.

A simple option is to use [nginx](http://wiki.nginx.org/Main) with a configuration like this:

    worker_processes  1;

    events {
        worker_connections  1024;
    }

    http {
        include       mime.types;
        default_type  application/octet-stream;

        sendfile        on;
        keepalive_timeout  65;

        upstream api_server { 
            server api.openweathermap.org;
        }

        upstream bennett_server { 
            server 127.0.0.1:80;
        }

        server { 

            listen       8080;
            server_name  localhost;

            location /api { 
                rewrite ^/\/api\/(.*)$ \/$2;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
                proxy_set_header X-NginX-Proxy true;
                proxy_pass http://api_server/;
                proxy_redirect off;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
            }

            location / {
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
                proxy_set_header X-NginX-Proxy true;
                proxy_pass http://bennett_server/;
                proxy_redirect off;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
            }

            error_page   500 502 503 504  /50x.html;

            location = /50x.html {
                root   html;
            }
        }
    }

This maps an upstream API server (api.openweathermap.org) and an upstream web server hosting Bennett (127.0.0.1:80) to one local domain (locahost:8080). Now accessing http://localhost:8080/ will make the browsers think all content is coming from the same source. Note that in the configuration above API calls are distinguished from Bennett content by beginning "/api/*", which needs to be reflected in the API definition files:

	my_api_spec:
		session:
			login:
		  		desc: "Login to the service"
		  		url: "/api/session"					# prefixed "/api/*"
		  		method: post
		  		body: some_user_data
		  		remember: session_data
		  		response: 201
			logout:
		  		desc: "Logout of the service"
		  		url: "/api/session/{session_id}"	# prefixed "/api/*"
		  		urldata:
		  			recall: session_data
		  		method: delete
		  		response: 201

## Detailed Specification


	**---- TODO ----**

#### Defining APIs

    login:
        desc: "Login and start user session"
        url: "/login"
        method: "post"
        encoding: "form"
        response: 201
        body: user_details
        remember: "login"
        latency: 500
        schema: >
            {
                "title": "Login Session Schema",
                "type": "object",
                "properties": {
                    "hubIds": {
                        "type": "array"
                    },
                    "ApiSession": {
                        "type": "string"
                    }
                }
                "required": [
                    "hubIds",
                    "ApiSession"
                ]
            }


#### Dynamic Data

urldata
body
cookies

three options
- fixed data
- reference to fixture data
- reference to session data

**update\_user**: This name this API must be referred to by in other files  
**desc**: The user friendly tag that will be used to record the results of calls to this API  
**url**: The URI, or URI template, that defines this URI's endpoint  
**method**: The HTTP verb used for this call ("get", "post", "put", "delete")  
**response**: The expected response from this API call  
**body**: A reference to the fixture data needed for this API call in the HTTP request body 
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

	
	
