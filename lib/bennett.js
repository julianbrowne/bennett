/**
 *  Bennett API Verifier
**/

var Bennett = function(options) { 

    var bennett = this;
    this.fixtures = null;
    this.api = null;
    this.scenarios = null;
    this.results = { };
    this.gridster = null;
    this.active = false;                            // is bennett running scenarios
    this.looping = false;                           // is loop mode on
    this.scenarioInProgress = false;                // is there a test scenario in progress
    this.lastScenarioPass = null;                   // last run scenario result
    this.allScenariosDone = false;                  // tripped when all scenarios complete (pass or fail)
    this.refreshFrequency = 10000; //300000;        // rerun tests every refreshFrequency milliseconds
    this.timer = false;                             // refresh interval timer {false || interval}
    this.testResultsDOMElement = "#test-results";   // place to put the results
    this.testId = 0;
    this.grid = null;
    this.testReport = {};                           // summary test report by scenario
    this.settings = parseOptions(options);    

    logAction("Bennett tester instantiated");

    this.dataLoad = $.when( 
        getDataFrom(bennett.settings.src.data), 
        getDataFrom(bennett.settings.src.api), 
        getDataFrom(bennett.settings.src.scenarios), 
        getDataFrom("conf/bennett.yml")
    );

    this.dataLoad.then(
        function(data, specs, scenarios, app) { 

            var dataObj = data[2];
            var specObj = specs[2];
            var testObj = scenarios[2];
            var confObj = app[2];

            try { 
                bennett.fixtures  = jsyaml.load(dataObj.responseText);
                bennett.api       = jsyaml.load(specObj.responseText);
                bennett.scenarios = jsyaml.load(testObj.responseText);
                bennett.config    = jsyaml.load(confObj.responseText);
            }
            catch(e) {
                console.log(e);
                throw "YAML Load error - " + e;
            }

            logAction("Set-up: Using server " + bennett.fixtures.basePath);

            $(window).resize(function () { 
                // nowt yet
            });

            if(bennett.fixtures.basePath === "testonly") { 
                bennett.fixtures.basePath = location.protocol + location.hostname + ":" + location.port;
                logAction("Test Mode: Set API base path to " + bennett.fixtures.basePath);
            }

            xssCheck(bennett.fixtures.basePath);

            apiDataCheck(bennett.api);

            if(bennett.api.general !== undefined)
                $("#test-name").html(bennett.api.general["test_name"]);
            else
                $("#test-name").html("Test Results");
        }
    );

    function apiDataCheck(apis) {

        apis = [];

        Object.keys(bennett.scenarios).forEach(
            function(scenario) {
                bennett.scenarios[scenario].forEach(
                    function(api) {
                        if(typeof(api) === 'string' && apis.indexOf(api) === -1) apis.push(api);
                    }
                );
            }
        );

        for(var i=0; i < apis.length; i++) { 
            var api = jsresolve(bennett.api, apis[i]);
            if(api.url === undefined)
                throw "No url defined for " + key + " " + (api.description === undefined ? "'no description'" : "'" + api.description + "'");
        }

    };

    function xssCheck(target) { 
        var anchor = document.createElement ('a');
        anchor.href = target;
        logAction("Performing XSS check");
        ["hostname", "port", "protocol"].forEach(
            function(part){
                if(location[part]!==anchor[part]) {
                    alert(
                          "Error\n\nDue to cross-site browser rules you cannot call remote APIs\n\n"
                        + "Cross-site means any different in domain, port or procotol between\n"
                        + "this site ("
                        + location.protocol + location.hostname + ":" + location.port
                        + ") and your target API ("
                        + anchor.protocol + anchor.hostname + ":" + anchor.port + ")\n\n"
                        + "To make this work you'll need to use a proxy."
                    );
                    throw "XSS detected - aborting"
                }
                else {
                    logAction("- " + part + " .. OK");
                }
            }
        );
    };

    function Exception(category, message) { 
        this.category = category;
        this.message  = message;
        logAction("*** ERROR : " + category + " / " + message, { class : "bold error" });
    };

    this.loopTests = function() { 
        bennett.looping = true;
        bennett.runTests();
        console.log("Starting timer");
        bennett.timer = setInterval(bennett.runTests, bennett.refreshFrequency);
    };

    this.stopTests = function() { 
        if(bennett.timer) { 
            console.log("Stopping timer");
            clearInterval(bennett.timer);
            bennett.timer = false;
            bennett.looping = false;
        }
        lastScenarioDoneEvent();
    };

    this.runTests = function() { 

        if(bennett.active) { 
            console.log("Warning: call to runTests() ignored, Bennett already running");
            return;
        }

        firstScenarioStartingEvent(); // TODO: replace with proper event hook mechanism
        bennett.dataLoad
            .then(function() { 
                var scenarios = Object.keys(bennett.scenarios);
                for(var i=0; i < scenarios.length; i++) { 
                    var scenarioName = scenarios[i];
                    runScenario(scenarioName);
                }
            });
    };

    function runScenario(scenarioName) { 

        var scenarioDisplayName = niceName(scenarioName);

        var b = new Piggybank(bennett.fixtures.basePath, { 
            //ignore404: true // do not treat 404 as a general error
        });

        b.logger = function(message) { logAction(message, { class: "piggy" }); };
        b.status = function(status) { bennett.lastScenarioPass = status; };

        bennett.fixtures.bennett = b.memory;

        bennett.scenarios[scenarioName].forEach( 
            function(scenarioData) { 
                if(typeof(scenarioData) === 'object') { 
                    var apiName = Object.keys(scenarioData)[0];
                    var scenarioOverrides = scenarioData[apiName];
                }
                else { 
                    var apiName = scenarioData;
                    var scenarioOverrides = {};
                }
                var apiData = jsresolve(bennett.api, apiName);
                apiData = $.extend({}, apiData, scenarioOverrides);

                if(apiData !== undefined) { 

                    var apiConfigData = { 
                        method: apiData.method, 
                        name: apiName,
                        cookies: {},
                        expectation: {}
                    };

                    if(apiData.response !== undefined) { 
                        apiConfigData.expectation.response = apiData.response;
                    }

                    if(apiData.schema != undefined) { 
                        apiConfigData.expectation.schema = parseType(apiData.schema);
                    }

                    if(apiData.latency != undefined) { 
                        apiConfigData.expectation.latency = apiData.latency;
                    }

                    if(apiData.encoding !== undefined) { 
                        apiConfigData.encoding = apiData.encoding;
                    }

                    if(apiData.ip !== undefined) { 
                        apiConfigData.clientIP = apiData.ip;
                    }

                    if(apiData.remember !== undefined) { 
                        apiConfigData.remember = apiData.remember;
                    }

                    /**
                     *  Add cookies to request header
                     *
                     *  cookie is one of: 
                     *      some.obj.reference => resolve within fixtures    type: string
                     *      recall object => look with session state         type: object
                     *      fixed data (integer string etc)
                    **/

                    if(apiData.cookies !== undefined) { 
                        Object.keys(apiData.cookies).forEach( 
                            function(cookie) { 
                                // try looking in fixtures
                                var source = jsresolve(bennett.fixtures, apiData.cookies[cookie]);
                                if(source === undefined) { 
                                    // try looking for recall tag
                                    if(apiData.cookies[cookie].recall !== undefined) { 
                                        apiConfigData.cookies[cookie] = { 
                                            recall: apiData.cookies[cookie].recall
                                        };
                                    }
                                    else { 
                                        // it's fixed data
                                        apiConfigData.cookies[cookie] = apiData.cookies[cookie];
                                    }
                                }
                                else { 
                                    if(typeof(source) !== "object") { 
                                        var key = lastElementInObjPath(cookie);
                                        apiConfigData.cookies[key] = source;
                                    }
                                    else { 
                                        // skip - it was an object in fixtures (invalid as cookie)
                                        console.log("Warning: could not set cookie " + cookie);
                                    }
                                }
                            }
                        );
                    }

                    /**
                     *  Add url or url plus data structure to resolve (static or recall object)
                     *  
                     *  Options are:
                     *  - regular string ("/my/url") => use as is
                     *  - uri template with
                     *      (a) no urldata defined => use fixtures in urldata
                     *      (b) recall object => pass recall object to piggybank
                     *      (c) static object => pass as is in urldata
                     *      (d) fixture reference => resolve from fixtures in urldata
                    **/

                    if(apiData.url.search(/{.*?}/) !== -1) { 
                        if(apiData.urldata === undefined || apiData.urldata === null) { 
                            apiConfigData.urldata = bennett.fixtures;
                        }
                        else { 
                            if(apiData.urldata.recall !== undefined) {
                                apiConfigData.urldata = { recall: apiData.urldata.recall };
                            }
                            else { 
                                var d = parseType(apiData.urldata);
                                if(typeof(d) === 'object') { 
                                    apiConfigData.urldata = d;
                                }
                                else { 
                                    apiConfigData.urldata = jsresolve(bennett.fixtures, apiData.urldata);
                                }
                            }
                        }
                    }
                    // else {
                    //      url is a regular string so use as-is
                    // }

                    /**
                     *  add post put request body
                     *
                     *  body is one of: 
                     *      fixed data (integer string etc)
                     *      some.obj.reference => resolve within fixtures    type: string
                     *      recall object => look with session state         type: object
                    **/

                    if(apiData.body!==undefined) { 
                        var source = jsresolve(bennett.fixtures, apiData.body);
                        if(source === undefined) { 
                            if(apiData.body.recall !== undefined) { 
                                var source = { recall: apiData.body.recall };
                            }
                            else { 
                                throw "body data cannot be parsed";
                            }
                        }
                        if(typeof(source) !== "object") { 
                            var bodyData = { };
                            var key = lastElementInObjPath(apiData.body);
                            bodyData[key] = source;
                        }
                        else { 
                            var bodyData = source;
                        }
                        apiConfigData.body = bodyData;
                    }
                    b.addCall(apiData.url, apiConfigData);
                }
                else { 
                    logAction("***  : No test details found for " + apiName);
                    throw "No api data found for " + apiName + "defined in " + scenarioName;
                }
            }
        );

        checkTestInProgress();

        /**
         *  Check Test In Progress
         *
         *  Checks flag to see if there's a scenarioName already running
         *  If there is then wait a second before checking again
         *  If there isn't then set the flag and prep for this scenarioName
         *
        **/

        function checkTestInProgress() { 
            if(bennett.scenarioInProgress === true) { 
                setTimeout(checkTestInProgress, 1000);
            }
            else { 
                if(bennett.allScenariosDone) { 
                    logAction("*** Aborting " + scenarioDisplayName + " because all scenarios done flag is set");
                    return;
                }
                prepNextTest(scenarioName);
            }
        };

        /**
         *  Prepare For Next Test (or quit)
         *
         *  Check if last scenarioName passed or failed. If it failed and we're stopping
         *  on failure then indicate to all queued tests that it's time to quit.
         *  Otherwise, line up the next test and commence API calls.
         *
        **/

        function prepNextTest() { 

            logAction("Scenario : " + scenarioDisplayName, { class: "bold" });

            var widget = new bennett.grid.Widget(scenarioDisplayName);
            widget.addClass("scenario");

            if(bennett.lastScenarioPass === false && bennett.settings.stopOnFail === true) { 
                logAction("*** Aborting because last test failed");
                widget.addLine("Aborted: Last Scenario Failed", "warning");
                widget.addClass("aborted");
                lastScenarioDoneEvent();
            }
            else { 
                bennett.scenarioInProgress = true;
                b.makeCallsSynchronously().done(reporter(widget, scenarioName));
            }

        };

    };

    function parseType(string) { 
        try { 
            var value = JSON.parse(string);
        }
        catch(err) { 
            try { 
                var value = eval(string);
            }
            catch(err) { 
                var value = string.toString();
            }
        }
        return value;
    };

    function logAction(message, options) { 
        var options = options || {};
        $("#test-log").append(
              "<li class='log-action'>" 
                + "<span class='timestamp'>" + timestamp() + "</span>" 
                + "<span class='message " + (options.class ? options.class : "") + "'>" + message + "</span>" 
            + "</li>"
        );
    };

    function Error(mesg) {
        // console.error(mesg);
        this.mesg = mesg;
    };

    function parseOptions(options) { 

        if(options === undefined || options === null) options = {};

        defaults = {
            src: {
                api : null,
                data: null,
                scenarios: null
            },
            stopOnFail: true                // stop all subsequent tests if last one failed
        };

        var settings = $.extend(true, {}, defaults, options);

        var mandatoryFields = [ 
            settings.src.api,
            settings.src.data,
            settings.src.scenarios
        ];

        for(var i=0; i < mandatoryFields.length; i++) { 
            if(!mandatoryFields[i]) { 
                throw new Error("Mandatory option " + i + " is not defined");
            }
            else {
                console.log("Option " + i + " set to " + mandatoryFields[i]);
            }
        }

        return settings;

    };

    /**
     * Returns uniform width timestamp 00:00:00:000
    **/

    function timestamp() { 
        var date = new Date();
        var t = 
            ("00" + date.getHours()).toString().slice(-2)
            + ":" + ("00"  + date.getMinutes()).toString().slice(-2)
            + ":" + ("00"  + date.getSeconds()).toString().slice(-2) 
            + ":" + ("000" + date.getMilliseconds()).toString().slice(-3);
        return t;
    };

    /**
     *  Reporter
     *
     *  Returns function that can process return test data from Piggybank.
     *  Sets class (colour) for scenario widget.
     *  Alerts subsequent scnearios what the status (pass/fail) of this scenario was.
     *  Iterates through results list recording results of each API call made.
     *
    **/

    function reporter(widget, name) { 
        return function(data) { 
            bennett.results[name] = data;
            var scenarioResultText = (data['summary'].passed === true ? 'pass' : 'fail');
            logAction("Callback for " + niceName(name) + " with result " + scenarioResultText);
            widget.addClass(scenarioResultText);
            if(data === undefined) return;
            for(var i=0; i < data['summary'].tests; i++) { 
                if(data[i] === undefined) break;
                var apiResultText = (testPassOrFail(data[i]) === true ? 'pass' : 'fail');
                var apiNameText = niceName(lastElementInPath(data[i].callData.name));
                var line = widget.addKeyValue( 
                    apiNameText, 
                    apiResultText, 
                      "URI: " + data[0].url 
                    + "<br/>Method: " + data[0].method 
                    + "<br/>Expected Response: " + data[0].expectation.response 
                    + "<br/>Received Response: " + data[0].outcome.response.received 
                    + "<br/>Expected Latency:  " + data[0].expectation.latency + " ms"
                    + "<br/>Received Latency:  " + data[0].outcome.timer.latency + " ms", 
                    { 
                        key: { 
                            class: "test-name"
                        },
                        value: { 
                            class: apiResultText
                        }, 
                        msg: {
                            class: "result-popup"
                        }
                    }
                );
                //var detail = addDetailDialog(widget.index, widget.lines, data[i]);
                //$(line).on("click", function() { detail.dialog("open"); } );
            }

            var numScenarios = Object.keys(bennett.scenarios).length;
            var lastScenarioName = Object.keys(bennett.scenarios)[numScenarios -1];

            bennett.scenarioInProgress = false;

            if(name === lastScenarioName) lastScenarioDoneEvent();

        }
    };

    /**
     *  Before first scenario and after last scenario events
    **/

    function firstScenarioStartingEvent() { 
        bennett.active = true;
        bennett.allScenariosDone = false;
        disableButton("#start-tests");
        disableButton("#loop-tests");
        bennett.initialiseOutputGrid(bennett.testResultsDOMElement);
    };

    function lastScenarioDoneEvent() { 
        bennett.allScenariosDone = true;
        bennett.active = false;
        if(!bennett.looping) { 
            enableButton("#start-tests");
            enableButton("#loop-tests");
        }
    };

    function disableButton(buttonElementId) { 
        $(buttonElementId)
            .addClass('disabled')
            .prop('disabled', true);
    };

    function enableButton(buttonElementId) { 
        $(buttonElementId)
            .removeClass('disabled')
            .prop('disabled', false);
    };

    this.initialiseOutputGrid = function(element) { 
        $(element).empty();
        bennett.grid = new Grid(element);
        bennett.grid.widgetDefaults.width = 340;
        bennett.grid.widgetDefaults.height = 190;
        // bennett.grid.autoHeight = true;
    };

    function addDetailDialog(scenarioId, testId, data) { 
        var testDetailId = "widget-detail-" + scenarioId + "-" + testId;
        var testDetailSelector = "#" + testDetailId;
        var testDetailDiv  = $("<div>", { id: testDetailId, class: "detail", title: data.callData.name });
        $("body").append(testDetailDiv);
        addDetail("<p>HTTP " + data.callData.method.toString().toUpperCase() + " to " + data.url + "</p>")
        if(data.expectation.response !== undefined) { 
            addDetail("<p>Expected " + data.expectation.response + "</p>");
        }
        addDetail("<p>Got " + data.outcome.response.received + "</p>")
        if(data.expectation.latency !== undefined) { 
           addDetail("<p>Max time " + data.expectation.latency + " ms</p>")
        }
        addDetail("<p>Time taken " + data.outcome.timer.latency + " ms</p>");
        $(testDetailSelector).dialog({ 
            modal: true,
            width: "50%",
            position: { my: "top center", at: "top center", of: window },
            autoOpen: false
        });
        return $(testDetailSelector);
        function addDetail(text) { $(testDetailSelector).append(text); };
    };

    function testPassOrFail(result) { 
        if(result === undefined) return false;
        if(bennett.config.pass.response && result.outcome.response !== undefined && !result.outcome.response.expectationMet) {
            return false;
        }
        if(bennett.config.pass.schema && result.outcome.schema !== undefined && !result.outcome.schema.expectationMet) {
            return false;
        }
        if(bennett.config.pass.latency && result.outcome.latency !== undefined && !result.outcome.timer.expectationMet) {
            return false;
        }
        return true;
    };

    function lastElementInObjPath(objPath) { 
        var parts  = objPath.split('.');
        var length = parts.length;
        return parts[length-1];
    };

    function getDataFrom(url) { 
        logAction("Loading data from " + url);
        return $.get(url)
            .done(function(data, status, xhr) { logAction("Load: Called " + url + ", got status " + xhr.status); })
            .fail(function(e) { logAction(e); });
    };

    function lastElementInPath(fullPath) { 
        var elements = fullPath.toString().split('.');
        return elements[elements.length - 1];
    };

    function niceName(str) { 
        function capitalise(lowercaseString) { 
            var capitalisedString = "";
            var words = lowercaseString.split(" ");
            words.forEach(function(word) {
                var capitalisedWord = word.charAt(0).toUpperCase() + word.slice(1);
                capitalisedString += capitalisedWord + " ";
            });
            return capitalisedString.slice(0,-1);
        };
        return capitalise(str.toString().replace(/_/g," "));
    };

    this.parseApiSpec = function(apiData, path, targetElement) { 
        var apiSpec = jsresolve(apiData, path);
        var output = $(targetElement).append( 
              "<div class='section'>"
            + "<h2>" 
            + (apiSpec.method === undefined ? "- not defined -" : apiSpec.method.toUpperCase())
            + "<span class='call'>"
            + ( apiSpec.url || "- not defined -")
            + "</span>"
            + "</h2>"
            + "<p>"
            + ( apiSpec.description || "- not defined -")
            + "</p>"
            + "</div>"
        );
        var section = output.children(".section").last();
        if(apiSpec.arguments !== undefined) { 
            section.append( 
                  "<div class='args'>"
                + "<h3>Arguments:</h3>"
                + "<dl class='definition'>"
                + "</dl>"
                + "</div>"
            );
            var args = section.find("dl.definition");
            Object.keys(apiSpec.arguments).forEach( 
                function(argument) { 
                    args.append( 
                          "<dt>" + argument + "</dt>"
                        + "<dd>" + apiSpec.arguments[argument] + "</dd>"
                    );
                }
            );
        }
        if(apiSpec.schema !== undefined) { 
            section.append( 
                  "<div class='sample'>"
                + "<h3>Response</h3>"
                + "<p class='json'>"
                + apiSpec.schema
                + "</p>"
                + "</div>"
            );
        }
        if(apiSpec.notes !== undefined) { 
            section.append("<p class='note'>" + apiSpec.notes + "</p>");
        }
        if(apiSpec.errors !== undefined) { 
            section.append( 
                  "<div class='errors'>"
                + "<h3>Returned errors:</h3>"
            );
            Object.keys(apiSpec.errors).forEach( 
                function(error) { 
                    section.children(".errors")
                        .last()
                        .append(
                              "<dl>"
                            + "<dt>" 
                            + apiSpec.errors[error].response 
                            + " "
                            + error.toUpperCase()
                            + "</dt>"
                            + "<dd>"
                            + apiSpec.errors[error].description
                            + "</dd>"
                            + "</dl>"
                        );
                }
            );
        }
    }

    this.documentApi = function(targetElement) { 
        var apiResponse = $.when($.get(bennett.settings.src.api));
        apiResponse.then(
            function(apiRawData) { 
                try { var apiData = jsyaml.load(apiRawData) } catch(e) { throw e; }
                if(apiData.general.test_name !== undefined) $(targetElement).append("<h1>" + apiData.general.test_name + "</h2>");
                Object.keys(apiData).forEach(function(key) { parser(key) });
                function parser(key, path) { 
                    if(key === "url") {
                        bennett.parseApiSpec(apiData, path, targetElement);
                    }
                    else {
                        if(path === undefined) { 
                            var path = key;
                            var target = apiData[key];
                        }
                        else { 
                            var path = path + "." + key;
                            var target = jsresolve(apiData, path);
                        }

                        if(typeof(target) === 'object') { 
                            Object.keys(target).forEach( 
                                function(key) { 
                                    parser(key, path)
                                }
                            );
                        }
                    }
                }
            }
        );
    };

};

Bennett.swagger = function(json) { 

    spec = {};

    json.apis.forEach(
        function(api, i) { 
            api.operations.forEach( 
                function(operation, j) {
                    spec[operation.nickname] = {}
                    spec[operation.nickname].url = api.path;
                    spec[operation.nickname].method = operation.httpMethod;
                    spec[operation.nickname].notes = operation.notes;
                    spec[operation.nickname].description = operation.summary;
                    spec[operation.nickname].schema = operation.responseClass;
                    spec[operation.nickname].arguments = {};
                    if(operation.parameters) {
                        operation.parameters.forEach( 
                            function(parameter, k) { 
                                var name = json.apis[i].operations[j].parameters[k].name;
                                var type = json.apis[i].operations[j].parameters[k].dataType;
                                spec[operation.nickname].arguments[name] = type;
                            }
                        )
                    }
                }
            )
        }
    );

    return spec;

};

Bennett.jsonToYaml = function(data) {

    var handlers;
    var indentLevel = "";

    var classes = "Boolean Number String Function Array Date RegExp Object".split(" ");
    var class2type = {};
    var name;

    for (var i in classes) { 
      if (classes.hasOwnProperty(i)) { 
        name = classes[i];
        class2type["[object " + name + "]"] = name.toLowerCase();
      }
    }

    function typeOf(obj) {
      return (null === obj || undefined === obj) ? String(obj) : class2type[Object.prototype.toString.call(obj)] || "object";
    };

    handlers = { 
        undefined: function () {
            return "null"
        },
        "null": function () {
            return "null"
        },
        number: function (x) {
            return x
        },
        "boolean": function (x) {
            return x ? "true" : "false"
        },
        string: function (x) {
            return JSON.stringify(x)
        },
        array: function (x) {
            var output = "";
            if (0 === x.length) {
                output += "[]";
                return output
            }
            indentLevel = indentLevel.replace(/$/, "  ");
            x.forEach(function (y) {
                var handler = handlers[typeOf(y)];
                if (!handler) {
                    throw new Error("what the crap: " + typeOf(y))
                }
                output += "\n" + indentLevel + "- " + handler(y)
            });
            indentLevel = indentLevel.replace(/  /, "");
            return output
        },
        object: function (x) {
            var output = "";
            if (0 === Object.keys(x).length) {
                output += "{}";
                return output
            }
            indentLevel = indentLevel.replace(/$/, "  ");
            Object.keys(x).forEach(function (k) {
                var val = x[k],
                    handler = handlers[typeOf(val)];
                if ("undefined" === typeof val) {
                    return
                }
                if (!handler) {
                    throw new Error("what the crap: " + typeOf(val))
                }
                output += "\n" + indentLevel + k + ": " + handler(val)
            });
            indentLevel = indentLevel.replace(/  /, "");
            return output
        },
        "function": function () {
            return "[object Function]"
        }
    };
    return "---" + handlers[typeOf(data)](data) + "\n"
};
