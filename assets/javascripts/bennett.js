
var Bennett = function(dataSrc, specSrc, testSrc) {

    var bennett     = this;
    this.fixtures   = null;
    this.api        = null;
    this.cases      = null;
    this.gridster   = null;
    this.inProgress = false;
    this.testId    = 0;

    logAction("Bennett tester instantiated");

    this.config = $.when(getDataFrom(dataSrc), getDataFrom(specSrc), getDataFrom(testSrc), getDataFrom("conf/bennett.yml"));

    this.config.then(
        function(data, specs, scenarios, app) { 

            var dataObj = data[2];
            var specObj = specs[2];
            var testObj = scenarios[2];
            var confObj = app[2];

            try { 
                bennett.fixtures = jsyaml.load(dataObj.responseText);
                bennett.api      = jsyaml.load(specObj.responseText);
                bennett.cases    = jsyaml.load(testObj.responseText);
                bennett.config   = jsyaml.load(confObj.responseText);
            }
            catch(e) {
                console.log(e);
                throw new Exception("YAML", "Load error - " + e);
            }

            logAction("Using server " + bennett.fixtures.root);
            logAction("Setting up grid");

            bennett.gridster = $(".gridster ul")
                .gridster({
                    widget_margins: [10, 10],
                    widget_base_dimensions: [300, 80]
                }).data('gridster');

            $(window).resize(function () { 
                // TODO: redraw gridster 
                // or switch to floating divs and
                // remove gridster ..
            });

            $("#test-name").html(bennett.api.general["test_name"]);

            $.get(bennett.fixtures.root).fail(
                function(xhr, textStatus, errorString) { 
                    if(xhr.status === 500 || textStatus === 'timeout') {
                        throw new Exception("INIT", "Couldn't find a server at " + bennett.fixtures.root);
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
                var testCaseNames = Object.keys(bennett.cases)
                for(var i=0; i < testCaseNames.length; i++) { 
                    var testCaseName = testCaseNames[i];
                    var testCase = bennett.cases[testCaseName];
                    logAction("Case : " + niceName(testCaseName), { class: "bold" });
                    testCycle(testCaseName);
                }
            }
        );
    };

    function testCycle(testCase) { 

        var b = new Piggybank(bennett.fixtures.root, { 
            //ignore404: true,
            //stopOnSurprise: true,
            logger: function(message) { logAction("piggybank : " + message, { class: "piggy" }); }
        });
        var w = new Widget(bennett.gridster);

        bennett.fixtures.bennett = b.memory;

        bennett.cases[testCase].forEach( 
            function(scenarioApiCall) { 
                if(typeof(scenarioApiCall) === 'object') { 
                    var apiName = Object.keys(scenarioApiCall)[0];
                    var scenarioOverrides = scenarioApiCall[apiName];
                }
                else { 
                    var apiName = scenarioApiCall;
                    var scenarioOverrides = {};
                }
                var apiData = resolve(bennett.api, apiName);
                apiData = $.extend({}, apiData, scenarioOverrides);

                logAction(lastElementInPath(apiName) + " (" + apiData.desc + ")");

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
                                logAction("Setting cookie " + cookie + " to " + apiData.cookies[cookie]);
                                apiConfigData.cookies[cookie] = parseType(apiData.cookies[cookie]);
                            }
                        );
                    }

                    // interpolate uri-template

                    if(apiData.url.search(/{.*?}/) !== -1) { 
                        var template = UriTemplate.parse(apiData.url);
                        apiConfigData.template = apiData.url;
                        if(apiData.dataroot !== undefined) { 
                            var dataSource = resolve(bennett.fixtures, apiData.dataroot);
                        }
                        else {
                            var dataSource = bennett.fixtures;
                        }
                        apiData.url = template.expand(dataSource);
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
                    logAction(apiConfigData.method.toString().toUpperCase() + " " + apiData.url + ", expecting " + apiConfigData.expect);
                }
                else { 
                    logAction("***  : No test details found for " + apiName);
                    throw "No api data found for " + apiName + "defined in " + testCase;
                }
            }
        );

        checkTestInProgress();

        function checkTestInProgress() {
            if(bennett.inProgress === true) { 
                setTimeout(checkTestInProgress, 1000);
            }
            else {
                bennett.inProgress = true;
                b.makeCallsSynchronously().done(reporter(w, testCase));
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
        var levels = path.split(".");
        var result = base;
        for(var i=0; i<levels.length; i++) { 
            var level = levels[i];
            if(result[level]!==undefined) { 
                result = result[level];
            }
            else { 
                return null;
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

    function timestamp() {
        var date = new Date();
        var t = 
              date.getHours() 
            + ":" + date.getMinutes() 
            + ":" + date.getSeconds() 
            + ":" + ("000" + date.getMilliseconds()).toString().slice(-3);
        return t;
    };

    function reporter(widget, name) { 
        return function(data) { 
            bennett.inProgress = false;
            widget.testCase(niceName(name));
            for(var i=0; i < data['summary'].tests; i++) { 
                widget.addTestResult(data[i], testPassOrFail(data[i]));
            }
            if(data['summary'].passed === true) {
                widget.passAll();
            }
            else {
                widget.failAll();
            }
            widget.publish();
        }
    };

    function testPassOrFail(result) { 
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
    }

    function lastElementInObjPath(objPath) { 
        var parts  = objPath.split('.');
        var length = parts.length;
        return parts[length-1];
    }

    function Widget(gridster) { 

        this.testCase = "";
        this.content = "<ul class='leaders'></ul>";

        this.addContent = function(content) { 
            this.content = this.widget.html();
            this.content += content;
            this.widget.html(this.content);
        };

        this.testCase = function(testCase) { 
            this.testCase = testCase;
            this.widget = gridster.add_widget("<li class='test-set'>" + '<div class="test-name">' + this.testCase + "</div>" + this.content + "</li>", 1, 2);
        };

        this.addTestResult = function(testData, result) { 
            var resultText = (result === true ) ? 'pass' : 'fail';
            var list = this.widget.children("ul.leaders");
            var testName = lastElementInObjPath(testData.callData.name);
            var id = (bennett.testId++);
            var testLineItemId = "test-summary-" + id;
            var testLineItemDetailId = "test-detail-" + id;

            var listItem       = $("<li>",   { id: testLineItemId, class: "test-item" });
            var testNameSpan   = $("<span>", { class: "name" }).html(niceName(testName));
            var testResultSpan = $("<span>", { class: "result " + resultText }).html(resultText);

            list.append(listItem);
            $("#" + testLineItemId)
                .append(testNameSpan)
                .append(testResultSpan);

            var testDetailDiv  = $("<div>", { 
                id: testLineItemDetailId,
                class: "test-item-explanation",
                title: niceName(testName)
            });

            list.append(testDetailDiv);
            addDetail("<p>HTTP " + testData.callData.method.toString().toUpperCase() + " to " + testData.url + "</p>")

            if(testData.expectation.response !== undefined) { 
                addDetail("<p>Expected " + testData.expectation.response + "</p>");
            }

            addDetail("<p>Got " + testData.outcome.response.received + "</p>")

            if(testData.expectation.latency !== undefined) { 
               addDetail("<p>Max time " + testData.expectation.latency + " ms</p>")
            }

            addDetail("<p>Time taken " + testData.outcome.timer.latency + " ms</p>");

            $("#" + testLineItemDetailId).dialog({ 
                modal: true,
                width: "50%",
                position: { my: "top center", at: "top center", of: window },
                autoOpen: false
            });

            $(document).on("click", "#" + testLineItemId, 
                function() { 
                    $("#" + testLineItemDetailId).dialog("open");
                }
            );

            function addDetail(text) { 
                $("#" + testLineItemDetailId).append(text);
            };
        };

        this.passAll = function() { 
            this.widget.addClass("pass", 2000);
        };

        this.failAll = function() { 
            this.widget.addClass("fail", 2000);
        };

        this.publish = function() { 
            this.addContent("</ul>");
        };
    };

    function getDataFrom(url) { 
        logAction("Loading data from " + url);
        return $.get(url)
            .done(function(data, status, xhr) { logAction("Called " + url + ", got status " + xhr.status); })
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
