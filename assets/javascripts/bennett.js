
var Bennett = function(dataSrc, specSrc, testSrc) {

    var testdriver  = this;
    this.logELement = "#test-log";
    this.config     = $.when(getDataFrom(dataSrc), getDataFrom(specSrc), getDataFrom(testSrc));
    this.fixtures   = null;
    this.api        = null;
    this.cases      = null;

    logAction("Bennett tester instantiated")

    this.config.done(
        function(dataResult, specResult, testResult) {

        var dataObj = dataResult[2];
        var specObj = specResult[2];
        var testObj = testResult[2];

        testdriver.fixtures = jsyaml.load(dataObj.responseText);
        testdriver.api      = jsyaml.load(specObj.responseText);
        testdriver.cases    = jsyaml.load(testObj.responseText);

        logAction("Using server " + testdriver.fixtures.root);

        gridster = $(".gridster ul")
            .gridster({
                widget_margins: [10, 10],
                widget_base_dimensions: [215, 100]
            }).data('gridster');

        Object.keys(testdriver.cases).forEach( function(testCase) {
            if(testdriver.cases.hasOwnProperty(testCase)) {
                logAction("Case : " + niceName(testCase), true);
                var widget = new Widget(gridster);
                widget.testCase(testCase);
                var tests = $.when(testCycle(testCase, widget));
                tests.done(
                    function() {
                        logAction("Test case " + niceName(testCase) + " complete")
                        widget.publish();
                    }
                );
            }
        });
    });

    function testCycle(testCase, widget) {
        testdriver.cases[testCase].forEach(
            function(test) {
                logAction("Test : " + test);
                var testDetails = eval("testdriver.api." + test);

                if(testDetails !== undefined) {
                    logAction("Desc : " + testDetails.desc);

                    var uri = testDetails.uri;
                    var method = testDetails.method;
                    if(method === "post" && testDetails.arguments !== undefined) {
                        var messageBody = {};
                    }
                    else {
                        var messageBody = {};
                    }
                    var client = new Orphan(testdriver.fixtures.root);
                    logAction("Url  : " + uri);
                    var assert = assertment(widget, test);
                    client.request(uri, assert(testDetails.response), method, messageBody);
                }
                else {
                    widget.addTestResult(testName(test), "fail"); // skipped?
                    logAction("***  : No test details found for " + test);
                }
            }
        );
    };

    function makeCall() {
        return $.get(url)
            .done(function(data, status, xhr) { logAction("Called " + url + ", got status " + xhr.status); })
            .fail(function(e) { logAction(e); });
    };

    function logAction(message, bold) {
        var bold = bold === undefined ? false : true;
        var date = new Date();
        var timestamp = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + ":" + date.getMilliseconds();
        if(bold) {
            message = "<b>" + message + "</b>";
        }
        $("#test-log").append(
              "<li class='log-action'>" 
                + "<span class='timestamp'>"
                    + timestamp
                + "</span> - " 
                + "<span class='message'>"
                + message 
                + "</span>" 
            + "</li>"
        );
    };

    function assertment(widget, test) {
        return function(expectedStatus, expectedSchema) {
            return function(data, status, xhr) {
                console.log(widget);
                if(xhr.status !== expectedStatus) {
                    widget.addTestResult(testName(test), "fail");
                    logAction("FAIL : " + test + " - Expected " + expectedStatus + " but got " + xhr.status);
                }
                else {
                    widget.addTestResult(testName(test), "pass");
                    logAction("PASS : " + test + " - Expected " + expectedStatus + " and got " + xhr.status);
                }
            };
        };
    };

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
            this.widget = gridster.add_widget("<li class='pass'>" + '<div class="test-name">' + this.testCase + "</div>" + this.content + "</li>", 1, 2);
        };

        this.addTestResult = function(test, result) {
            var list = this.widget.children("ul.leaders");
            list.html(list.html()
                + "<li>"
                + "<span class='result'>"
                + niceName(test) 
                + "</span>"
                + "<span class='result + " + result + "'>"
                + result
                + "</span>"
                + "</li>");
        };

        this.publish = function() {
            //this.addContent("</ul>");
            //console.log(this.content);
        };
    };

/*
    function assert(outcome, description ) {
        var li = document.createElement('li');
        li.className = outcome ? 'pass' : 'fail';
        li.appendChild( document.createTextNode( description ) );
        output.appendChild(li);
    };
*/

    function getDataFrom(url) {
        logAction("Loading data from " + url);
        return $.get(url)
            .done(function(data, status, xhr) { logAction("Called " + url + ", got status " + xhr.status); })
            .fail(function(e) { logAction(e); });
    };

    function testName(fulltestPath) {
        var elements = fulltestPath.toString().split('.');
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
