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

  describe("Advanced operations", function() { 

    beforeEach(function() { 
      jasmine.Ajax.useMock();
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
