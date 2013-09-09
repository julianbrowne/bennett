describe("Piggybank", function() { 

  var piggy;

  beforeEach(function() { 
    piggy = new Piggybank("http://www.example.com/api");
  });

  it("should be present", function() { 
    expect(piggy).toBeDefined();
  });

  describe("Set-up options", function() { 

    it("should support all settings", function() { 
      piggy.timeout = 5000;
      piggy.ignore404 = true;
      piggy.ignoreErrors = true;

      expect(piggy.timeout).toEqual(5000);
      expect(piggy.ignore404).toEqual(true);
      expect(piggy.ignoreErrors).toEqual(true);
    });

  });

  describe("Basic operations", function() { 

    beforeEach(function() { 
      jasmine.Ajax.useMock();
    });

    it("should perform basic HTTP GET", function() { 

      piggy.addCall("/somewhere");
      piggy.makeCallsSynchronously();

      var request = mostRecentAjaxRequest();
      expect(request.url).toBe('http://www.example.com/api/somewhere');
      expect(request.method).toBe('GET');

    });

    it("should perform basic HTTP POST", function() { 

      piggy.addCall("/somewhere", { method: "post" });
      piggy.makeCallsSynchronously();

      var request = mostRecentAjaxRequest();
      expect(request.url).toBe('http://www.example.com/api/somewhere');
      expect(request.method).toBe('POST');

    });

    it("should perform basic HTTP PUT", function() { 

      piggy.addCall("/somewhere", { method: "put" });
      piggy.makeCallsSynchronously();

      var request = mostRecentAjaxRequest();
      expect(request.url).toBe('http://www.example.com/api/somewhere');
      expect(request.method).toBe('PUT');

    });

    it("should perform basic HTTP DELETE", function() { 

      piggy.addCall("/somewhere", { method: "delete" });
      piggy.makeCallsSynchronously();

      var request = mostRecentAjaxRequest();
      expect(request.url).toBe('http://www.example.com/api/somewhere');
      expect(request.method).toBe('DELETE');

    });

  });


  describe("Basic Responses", function() { 

    var request;
    var onSuccess;
    var onFailure;
    var http200 = { status: 200, responseText: { "message": "OK" } };
    var http400 = { status: 400, responseText: { "message": "Bad Request" } };
    var http404 = { status: 404, responseText: { "message": "Not Found" } };
    var publish = { show: function(result) { console.log("*****"); console.log(result); } };

    beforeEach(function() { 

      jasmine.Ajax.useMock();

      //onSuccess = jasmine.createSpy('onSuccess');
      //onFailure = jasmine.createSpy('onFailure');
      //piggy.ajaxSuccess = onSuccess;
      //piggy.ajaxFailure = onFailure;

      spyOn(piggy, 'ajaxCall').andCallThrough();
      spyOn(publish, 'show');

      piggy.addCall("/somewhere", { method: "get" });
      piggy.makeCallsSynchronously().done(publish.show);

      request = mostRecentAjaxRequest();
      expect(request.url).toBe('http://www.example.com/api/somewhere');
      expect(request.method).toBe('GET');

    });

    describe("return codes", function() { 

      beforeEach(function() { 
      });

      it("get a 200 OK response", function() { 

        request.response(http200);

        expect(request.status).toEqual(200);
        expect(request.responseText).toEqual({ "message": "OK" });
        expect(piggy.ajaxCall).toHaveBeenCalled();

      });

      it("get a 404 Not Found response", function() { 

        request.response(http404);

        expect(request.status).toEqual(404);
        expect(request.responseText).toEqual({ "message": "Not Found" });
        expect(piggy.ajaxCall).toHaveBeenCalled();

      });

    });

  });

  describe("Fake Server", function() { 

    var http400 = { status: 400, responseText: { "message": "Bad Request" } };
    var resultData;
    var config = { 
      url: '/users',
      status: 200,
      responseTime: 300,
      method: 'get',
      response: '{ "firstName": "fred", "lastName":  "Smith", "age": 99 }',
      encoding: "form",
      name: "jasmine fake server get /users/42",
      remember: "memory",
      schema: { 
        "type":"object",
        "properties": { 
          "firstName": { "type":"string" },
          "lastName": {  "type":"string" },
          "age": { "type": "integer" }
        },
        "required": [ 
          "firstName",
          "lastName",
          "age"
        ]
      },
      body: { id: "42" }
    };

    var flag = false; // should change to true
    var message = null; // should contain last log message

    beforeEach(function() { 

      $.mockjax({ 
          url: "http://www.example.com/api" + config.url,
          responseText: config.response,
          responseTime: config.responseTime,
          status: config.status
      });

      piggy.addCall(config.url, { 
        method: config.method, 
        name: config.name,
        body: config.body,
        expectation: {
          response: config.status,
          schema: config.schema
        },
        remember: config.remember,
        encoding: config.encoding
      });

      piggy.status = function(s) { flag = s; };
      piggy.logger = function(m) { message = m; };

      piggy.makeCallsSynchronously().done(function(data) { resultData = data; });
      waitsFor(
        function() { 
          return resultData !== undefined;
        },
        "call timed out",
        10000
      );
    });

    it("should activate callback with data", function() { 
      expect(resultData).toBeDefined();
    });

    it("should have 200 response in callback", function() { 
      console.log(resultData[0]);
      expect(resultData[0].outcome.response.received).toEqual(config.status);
    });

    it("should see original name in callback", function() { 
      expect(resultData[0].callData.name).toEqual(config.name);
    });

    it("should build correctly encoded body", function() { 
      expect(resultData[0].callData.encoding).toEqual(config.encoding);
      expect(resultData[0].callData.body).toEqual("id=" + config.body.id);
    });

    it("should validate correct json against schema", function() { 
      expect(resultData[0].outcome.schema.expectationMet).toEqual(true);
    });

    it("should have set status flag", function() { 
      expect(flag).toEqual(true);
    });

    it("should have picked up log messages", function() { 
      expect(message).not.toEqual(null);
    });

  });

  describe("Schema operations", function() { 

    it("should validate compliant, and fail non-compliant, JSON", function() { 

        var schema = {
            "title": "Example Person Schema",
            "type": "object",
            "properties": {
                "firstName": {
                    "type": "string"
                },
                "lastName": {
                    "type": "string"
                },
                "age": {
                    "description": "Age in years",
                    "type": "integer",
                    "minimum": 0
                }
            },
            "required": ["firstName", "lastName"]
        };
        var json   = { firstName: "fred", lastName: "Smith", age: 99 };
        var json2  = { firstName: "fred", age: 99 };

        var result  = tv4.validateMultiple(json, schema);
        var result2 = tv4.validateMultiple(json2, schema);

        expect(result.valid).toEqual(true);
        expect(result2.valid).toEqual(false);

    });


  });

});
