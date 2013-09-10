/**
 *  Bennett API Verifier
**/

var Bennett = function(dataSrc, specSrc, testSrc) {

    var bennett     = this;
    this.fixtures   = null;
    this.api        = null;
    this.scenarios  = null;
    this.gridster   = null;
    this.scenarioInProgress = false;        // is there a test scenario in progress
    this.lastScenarioPass = null;           // last run scenario result
    this.stopOnFailure = true;              // stop if last run scenario failed
    this.allScenariosDone = false;          // tripped when all scenarios complete (pass or fail)
    this.testId    = 0;

    logAction("Bennett tester instantiated");

    var grid = new Grid("#test-results");
    grid.widgetDefaults.width = 340;
    grid.widgetDefaults.height = 190;
    // grid.autoHeight = true;

    this.config = $.when(getDataFrom(dataSrc), getDataFrom(specSrc), getDataFrom(testSrc), getDataFrom("conf/bennett.yml"));

    this.config.then(
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

            logAction("Set-up: Using server " + bennett.fixtures.root);

            $(window).resize(function () { 
                // nowt yet
            });

            if(bennett.api.general !== undefined)
                $("#test-name").html(bennett.api.general["test_name"]);
            else
                $("#test-name").html("Test Results");

            $.get(bennett.fixtures.root).fail(
                function(xhr, textStatus, errorString) { 
                    if(xhr.status === 500 || textStatus === 'timeout') {
                        throw "INIT: Couldn't find a server at " + bennett.fixtures.root ;
                    }
                }
            );
        }
    );

    function Exception(category, message) { 
        this.category = category;
        this.message  = message;
        logAction("*** ERROR : " + category + " / " + message, { class : "bold error" });
    };

    this.runTests = function() { 
        bennett.config.then( 
            function() { 
                var scenarios = Object.keys(bennett.scenarios)
                for(var i=0; i < scenarios.length; i++) { 
                    var scenarioName = scenarios[i];
                    runScenario(scenarioName);
                }
            }
        );
    };

    function runScenario(scenarioName) { 

        var scenarioDisplayName = niceName(scenarioName);

        var b = new Piggybank(bennett.fixtures.root, { 
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
                var apiData = resolve(bennett.api, apiName);
                apiData = $.extend({}, apiData, scenarioOverrides);

                //logAction(lastElementInPath(apiName) + " (" + apiData.desc + ")");

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

                    if(apiData.remember !== undefined) { 
                        apiConfigData.remember = apiData.remember;
                    }

                    if(apiData.cookies !== undefined) { 
                        Object.keys(apiData.cookies).forEach( 
                            function(cookie) { 
                                //logAction("Setting cookie " + cookie + " to " + apiData.cookies[cookie]);
                                apiConfigData.cookies[cookie] = parseType(apiData.cookies[cookie]);
                            }
                        );
                    }

                    /**
                     *  Interpolate uri-template
                     *
                     *  url: /blah/{this}/{that}
                     *
                     *  dataRoot is one of: 
                     *     "nothing" => look through all fixtures            type: undefined
                     *     some.obj.reference => look within sub fixtures    type: string
                     *     recall object => look with session state          type: object
                    **/

                    if(apiData.url.search(/{.*?}/) !== -1) { 
                        var template = UriTemplate.parse(apiData.url);
                        apiConfigData.template = apiData.url;
                        if(apiData.urldata === undefined) { 
                            var d = bennett.fixtures;
                        }
                        else {
                            var urlDataSource = parseType(apiData.urldata);
                            if(typeof(urlDataSource) === 'string') {
                                var d = resolve(bennett.fixtures, apiData.urldata);
                            }
                            else
                                var d = urlDataSource;
                        }
                        apiData.url = template.expand(d);
                    }

                    // add post/put body

                    if(apiData.body!==undefined) { 
                        var dataSource = resolve(bennett.fixtures, apiData.body);
                        // if target is a string/int etc then make a piggybank object
                        if(typeof(dataSource) !== "object") { 
                            var body = { };
                            var name = lastElementInObjPath(apiData.body);
                            body[name] = dataSource;
                        }
                        else {
                            var body = dataSource;
                        }
                        apiConfigData.body = body;
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

            var widget = new grid.Widget(scenarioDisplayName);
            widget.addClass("scenario");

            if(bennett.lastScenarioPass === false && bennett.stopOnFailure === true) { 
                bennett.allScenariosDone = true;
                logAction("*** Aborting because last test failed");
                widget.addLine("Aborted: Last Scenario Failed", "warning");
                widget.addClass("aborted");
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

    function resolve(base, path) { 
        if(base === undefined) return undefined;
        var levels = path.split(".");
        var result = base;
        for(var i=0; i<levels.length; i++) { 
            var level = levels[i];
            if(result[level]!==undefined) { 
                result = result[level];
            }
            else { 
                console.log("Unable to resolve " + path);
                return undefined;
            }
        }
        return result;
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
     *  Sets class (colour) for secnario widget.
     *  Alerts subsequent scnearios what the status (pass/fail) of this scenario was.
     *  Iterates through results list recording results of each API call made.
     *
    **/

    function reporter(widget, name) { 
        return function(data) { 
            logAction("Callback for " + niceName(name) + " with result " + data['summary'].passed);
            if(data['summary'].passed === true) { 
                widget.addClass("pass");
            }
            else { 
                widget.addClass("fail");
            }
            if(data === undefined) return;
            for(var i=0; i < data['summary'].tests; i++) { 
                if(data[i] === undefined) break;
                var pf = testPassOrFail(data[i]);
                var resultText = (pf === true ) ? 'pass' : 'fail';
                var apiNameText = niceName(lastElementInPath(data[i].callData.name));
                var line = widget.addKeyValue(apiNameText, resultText, { class: "test-name" }, { class: resultText });
                var detail = addDetailDialog(widget.index, widget.lines, data[i]);
                $(line).on("click", function() { detail.dialog("open"); } );
            }
            bennett.scenarioInProgress = false;
        }
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

};
