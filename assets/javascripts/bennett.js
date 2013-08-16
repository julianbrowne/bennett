
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
                var tests = "<ul class='leaders'>";
                logAction(testDriver.cases[testCase]);
                testDriver.cases[testCase].forEach(function(test) { tests += "<li><span>" + test.toString().split('.')[test.toString().split('.').length-1].replace(/_/," ") + "</span><span class='pass'> pass </span></li>" });
                gridster.add_widget("<li class='pass'>" + '<div class="test-name">' + testCase.toString().replace(/_/g," ") + "</div>" + tests + "</li>", 1, 2);
            }
        });

        var client = new Orphan();
        console.log(client);
        }
   );

   function logAction(message) {
      var date = new Date();
      var timestamp = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + ":" + date.getMilliseconds();
      $("#test-log").append("<li><span style='color: #A52E01'>" + timestamp + "</span>: " + message + "</li>");
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

};
