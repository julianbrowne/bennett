
var Bennett = function(dataSrc, specSrc, testSrc) {

   this.logELement = "#test-log";
   this.config     = $.when(getDataFrom(dataSrc), getDataFrom(specSrc), getDataFrom(testSrc));

   logAction("Bennett tester instantiated")

   this.config.done(
        function(dataResult, specResult, testResult) {

        var dataObj = dataResult[2];
        var specObj = specResult[2];
        var testObj = testResult[2];

        var testDriver = {};
        testDriver.fixtures = jsyaml.load(dataObj.responseText);
        testDriver.api = jsyaml.load(specObj.responseText);
        testDriver.cases = jsyaml.load(testObj.responseText);

        gridster = $(".gridster ul")
            .gridster({
                widget_margins: [10, 10],
                widget_base_dimensions: [215, 100]
            }).data('gridster');

        Object.keys(testDriver.cases).forEach( function(testCase) {
            if(testDriver.cases.hasOwnProperty(testCase)) {
                logAction("Case : " + niceName(testCase));
                var widget = new Widget(gridster);
                widget.testCase(testCase);
                testDriver.cases[testCase].forEach(
                    function(test) {
                        logAction("Test : " + niceName(test));
                        widget.addTestResult(testName(test), "pass");
                    }
                );
                widget.publish();
            }
        });

        var client = new Orphan();
        console.log(client);
        }
   );

    function logAction(message) {
        var date = new Date();
        var timestamp = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + ":" + date.getMilliseconds();
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

    function Widget(gridster) {
        var widget = this;
        this.gridster = gridster;
        this.content = "<ul class='leaders'>";
        this.addContent = function(content) { this.content += content; };
        this.testCase = function(testCase) { this.testCase = testCase; };
        this.addTestResult = function(test, result) {
            this.addContent(
                  "<li>"
                + "<span class='result'>"
                + niceName(test) 
                + "</span>"
                + "<span class='result + " + result + "'>"
                + result
                + "</span>"
                + "</li>"
            );
        };
        this.publish = function() {
            widget.addContent("</ul>");     
            widget.gridster.add_widget("<li class='pass'>" + '<div class="test-name">' + this.testCase + "</div>" + this.content + "</li>", 1, 2);
        };
    };

    function assert(outcome, description ) {
        var li = document.createElement('li');
        li.className = outcome ? 'pass' : 'fail';
        li.appendChild( document.createTextNode( description ) );
        output.appendChild(li);
    };

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
