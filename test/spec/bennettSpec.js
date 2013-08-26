describe("Bennett", function() { 

  var bennett;


  beforeEach(function() { 
    var data = "test/spec/data/fixtures.yml";
    var spec = "test/spec/data/api.yml";
    var test = "test/spec/data/tests.yml";
    bennett = new Bennett(data, spec, test);
  });

  it("should be present", function() { 
    expect(bennett).toBeDefined();
  });

  describe("URI Templating", function() { 
    beforeEach(function() { 

    });

    it("should expand URI templates", function() { 
      var template = UriTemplate.parse('/users/{id}');
      var uri = template.expand({id: 42});

      expect(uri).toEqual("/users/42");
    });

  });
});
