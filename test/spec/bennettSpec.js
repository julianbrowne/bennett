describe("Bennett", function() { 

  var bennett;

  beforeEach(function() { 
    var data = "data/selftest/data.yml";
    var api  = "data/selftest/api.yml";
    var scn  = "data/selftest/scenarios.yml";
    bennett = new Bennett(data, api, scn);
    waitsFor( 
      function() { return bennett.scenarios !== null; },
      "Bennet object creation timed out",
      10000
    );
  });

  it("should be present", function() { 
    expect(bennett).toBeDefined();
    expect(bennett).not.toBeNull();
  });

  it("should have an API spec", function() { 
    expect(bennett.api).toBeDefined();
    expect(bennett.api).not.toBeNull();
  });

  it("should have fixture data", function() { 
    expect(bennett.fixtures).toBeDefined();
    expect(bennett.fixtures).not.toBeNull();
  });

  it("should have an API root URL in the fixture data", function() { 
    expect(bennett.fixtures.root).toBeDefined();
    expect(bennett.fixtures.root).not.toBeNull();
  });

  it("should have test scenarios", function() { 
    expect(bennett.scenarios).toBeDefined();
    expect(bennett.scenarios).not.toBeNull();
  });

  it("should have parsed all scenarios", function() { 
      console.log(bennett);
      expect(Object.keys(bennett.scenarios).length).toEqual(3);
  });

  it("should expand URI templates", function() { 
    var template = UriTemplate.parse('/users/{id}');
    var uri = template.expand({id: 42});
    expect(uri).toEqual("/users/42");
  });

});