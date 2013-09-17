describe("Bennett", function() { 

  var bennett;
  var results=null;
  var scenarios = 7;

  beforeAll(function() { 

    var domain = location.protocol + location.hostname + ":" + location.port;
    var responseTime = 50;

    $.mockjax({ 
        url: domain + "/one",
        type: "get",
        responseTime: responseTime,
        status: 200
    });

    // uri templated variant 1

    $.mockjax({ 
        url: domain + "/one/10/20",
        type: "get",
        responseTime: responseTime,
        status: 200
    });

    // uri templated variant 2

    $.mockjax({ 
        url: domain + "/one/99/100",
        type: "get",
        responseTime: responseTime,
        status: 200
    });

    $.mockjax({ 
        url: domain + "/one?gimme201",
        type: "get",
        responseTime: responseTime,
        status: 201
    });

    $.mockjax({ 
        url: domain + "/two",
        type: "post",
        responseTime: responseTime,
        status: 201
    });

    $.mockjax({ 
        url: domain + "/three",
        type: "get",
        responseText: '{ "name": "bennett", "type":  "test" }',
        responseTime: responseTime,
        status: 200
    });

    $.mockjax({ 
        url: domain + "/four",
        type: "post",
        responseText: '{ "name": "bennett", "type":  "test" }',
        responseTime: responseTime,
        status: 201
    });

    var data = "data/selftest/data.yml";
    var api  = "data/selftest/api.yml";
    var scn  = "data/selftest/scenarios.yml";
    bennett = new Bennett(data, api, scn);
    bennett.targetElement("#none");
    waitsFor( 
      function() { return bennett.scenarios !== null; },
      "Bennet object creation timed out",
      10000
    );

    bennett.runTests();

    // wait for all test results to be collected

    waitsFor( 
      function() { return Object.keys(bennett.results).length === scenarios; },
      "Bennet return-results timed out",
      10000
    );

  });

  it("should be present", function() { 
    expect(bennett).toBeDefined();
    expect(bennett).not.toBeNull();
  });

  it("should expand URI templates", function() { 
    var template = UriTemplate.parse('/users/{id}');
    var uri = template.expand({id: 42});
    expect(uri).toEqual("/users/42");
    //console.log(bennett);
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
      expect(Object.keys(bennett.scenarios).length).toEqual(scenarios);
  });

  it("should have detected response override", function() { 
      expect(bennett.scenarios.override_an_expected_response["0"].basic_get.response).toEqual(201);
  });

  it("should have parsed all scenarios", function() { 
      expect(Object.keys(bennett.scenarios).length).toEqual(scenarios);
  });

  it("should have parsed URI template variations", function() { 
      console.log(bennett);
      expect(bennett.results["url_template_variations"]["0"].url).toEqual("/one/10/20");
      expect(bennett.results["url_template_variations"]["1"].url).toEqual("/one/99/100");
  });

});
