
var Bennett = function(dataSrc, specSrc, testSrc) {

    var testdriver  = this;
    this.logELement = "#test-log";
    this.fixtures   = null;
    this.api        = null;
    this.cases      = null;
    this.gridster   = null;

    logAction("Bennett tester instantiated");

    this.config = $.when(getDataFrom(dataSrc), getDataFrom(specSrc), getDataFrom(testSrc));

    this.config.then(
        function(dataResult, specResult, testResult) {

        var dataObj = dataResult[2];
        var specObj = specResult[2];
        var testObj = testResult[2];

        try {
            testdriver.fixtures = jsyaml.load(dataObj.responseText);
            testdriver.api      = jsyaml.load(specObj.responseText);
            testdriver.cases    = jsyaml.load(testObj.responseText);
        } catch(err) {
            alert("Invalid YAML files");
            throw "YAML Error " + err;
        }

        logAction("Using server " + testdriver.fixtures.root);
        logAction("Setting up grid");

        testdriver.gridster = $(".gridster ul")
            .gridster({
                widget_margins: [10, 10],
                widget_base_dimensions: [215, 100]
            }).data('gridster');
        }
    );

    this.runTests = function() {
        testdriver.config.then(
            function() {
                Object.keys(testdriver.cases).forEach( function(testCase) { 
                    if(testdriver.cases.hasOwnProperty(testCase)) { 
                        logAction("Case : " + niceName(testCase), true);
                        testCycle(testCase);
                    }
                })
            }
        );
    };

    function testCycle(testCase) { 

        var b = new Piggybank(testdriver.fixtures.root);
        var w = new Widget(testdriver.gridster);

        b.ignore404 = true;

        testdriver.cases[testCase].forEach(
            function(test) {
                logAction("Test : " + test);
                var testDetails = eval("testdriver.api." + test);

                if(testDetails !== undefined) {
                    logAction("Desc : " + testDetails.desc);
                    var uri = testDetails.uri;
                    var method = testDetails.method;
                    b.addCall(testDetails.uri, testDetails.method);

                    logAction("Url  : " + uri);
                    //var assert = assertment(widget, test);
                }
                else {
                    logAction("***  : No test details found for " + test);
                }
            }
        );

        b.makeCallsSynchronously().done(reporter(w, testCase));

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

   function reporter(widget, name) {
        return function(data) {
            console.log(data);
            widget.testCase(niceName(name));
            Object.keys(data).forEach(
                function(test) {
                    result = data[test];
                    widget.addTestResult(result.url, result.status);
                }
            );
            widget.publish();
        }
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
            this.addContent("</ul>");
            console.log(this.content);
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



    function getFields(url) {

      var ajaxPromise = $.get(url);

      var dff = $.Deferred();

      ajaxPromise.then(function(data) {

        var result = {
          'field1' : field1,
          'field2' : field2
        };

        dff.resolve(result);

      }, function() {
        dff.reject( );
      });

      return dff.promise();
    };

    var fieldPromise = getFields('http://something');

    fieldPromise.done(function(result){
      console.log(JSON.stringify(result)); 
    });

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
