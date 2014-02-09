describe("Bennett", function() { 

  var bennett;
  var results=null;
  var scenarios = 7;

  beforeAll(function() { 

    var domain = location.protocol + location.hostname + ":" + location.port;
    var responseTime = 10;

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

    // uri templated variant 3

    $.mockjax({ 
        url: domain + "/one/254/255",
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
        responseText: '{ "a": "254", "b":  "255" }',
        responseTime: responseTime,
        status: 200
    });

    $.mockjax({ 
        url: domain + "/four",
        type: "post",
        responseText: '{ "a": "254", "b":  "255" }',
        responseTime: responseTime,
        status: 201
    });

    var config = { 
      src: { 
        data:      "data/selftest/data.yml",
        api:       "data/selftest/api.yml",
        scenarios: "data/selftest/scenarios.yml"
      }
    };

    bennett = new Bennett(config);

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

  it("should have an API spec", function() { 
    expect(bennett.api).toBeDefined();
    expect(bennett.api).not.toBeNull();
  });

  it("should have fixture data", function() { 
    expect(bennett.fixtures).toBeDefined();
    expect(bennett.fixtures).not.toBeNull();
  });

  it("should have an API base path URL in the fixture data", function() { 
    expect(bennett.fixtures.basePath).toBeDefined();
    expect(bennett.fixtures.basePath).not.toBeNull();
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

  it("should have run all URI template variations", function() { 
      // 5 scenarios plus 1 summary data = 6 results
      expect(Object.keys(bennett.results["url_template_variations"]).length).toEqual(6);
  });

  it("should have correctly parsed fixture data URI template variation", function() { 
      expect(bennett.results["url_template_variations"]["0"].url).toEqual("/one/10/20");
  });

  it("should have correctly parsed default/undefined data URI template variation", function() { 
      expect(bennett.results["url_template_variations"]["1"].url).toEqual("/one/10/20");
  });

  it("should have correctly parsed static data URI template variation", function() { 
      expect(bennett.results["url_template_variations"]["2"].url).toEqual("/one/99/100");
  });

  it("should have correctly called source data url for URI template variation", function() { 
      expect(bennett.results["url_template_variations"]["3"].url).toEqual("/three");
  });

  it("should have correctly used recall session data URI template variation", function() { 
      expect(bennett.results["url_template_variations"]["4"].url).toEqual("/one/254/255");
  });

});
