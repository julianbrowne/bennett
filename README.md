
##Bennett

A simple REST API test framework, designed to be (nearly) 100% data-driven.

###Design

Bennett is designed to auto-generate and run Jasmine tests from three YAML files:

-	An API specification which details agreed characteristics of behaviour   
-	Some sample test data (login names etc)   
-	A method, or flow, for running generated tests   

###Example

A simple API spec might look like this:

	log_in: 
      desc: "Creates a logged in session"
      uri: /myapp/login
      arguments: 
        - username
        - password
      method: post
      response: 201
      schema:
          {
             "sessionId": { "type": "string" }
          }

    log_out: 
      desc: "Destroys a logged in session"
      uri: /myapp/session/{sessionId}
      method: delete
      response: 204

An API endpoint is specified by a YAML section containing a description of the API (for later rendering to the user), a URI or URI template for the API call, some argument expected by the API (if POSTing), a method (get, put, post, delete, etc), the expected response where the API call has succeeded (200, 201, etc), and finally a JSON schema description of a valid response (optional). As JSON is valid YAML JSON schemas can be entered in to the YAML config files without modification.

Test data for this API specification would then be:

	root: "http://example.com/apiroot"
	username: "bob"
	password: "bobs_secret_password"

And the test flow is:

	log_in_and_out_test:
	   - log_in
	   - log_out

	next_test:
		- do_something
		- do_the_next_thing
		- and_so_on

Which essentially indicates the test **log\_in\_and\_out\_test** comprises running **log\_in** followed by **log\_out**


