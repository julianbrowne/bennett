/**
 *  PiggyBank
**/

function Piggybank(root, options) { 

    var piggy = this;
    this.queue = [];
    this.results = {};
    this.deferred = null;
    this.timeout = 10000;
    this.root = root;
    this.last = null;
    this.memory = {};
    this.logger = function(message) { };
    this.status = function(status) { };
    this.allDone = false;

    var options = (options === undefined) ? {} : options;

    setOption('ignore404', false);
    setOption('ignoreErrors', false);
    setOption('stopOnSurprise', true);

    this.results['summary'] = { 
        ignoreErrors: this.ignoreErrors,
        ignore404: this.ignore404,
        tests: 0,
        passed: null,
        passes: [],
        fails: []
    };

    function setOption(option, def) { 
        piggy[option] = (options[option] === undefined) ? def : options[option];
    };

    this.addCall = function(url, callData) { 
        callData = (callData === undefined) ? {} : callData;
        callData.method = (callData.method === undefined) ? 'get' : callData.method;
        callData.id = this.queue.length;
        this.queue.push({ url: url, data: callData });
        this.results['summary'].tests += 1;
    };

    this.recall = function(key) { 
        return function() { 
            return resolve(piggy.memory, key);
        }
    };

    this.makeCalls = function() { 
        piggy.cookieClear();
        piggy.deferred = $.Deferred();
        this.queue.forEach(function(api) { 
            var call = piggy.ajaxCall(api);
            if(piggy.last !== null) { 
                piggy.last.then(function(d) { 
                    piggy.last = call;
                    call
                        .done(piggy.callPassed(api.url, api.data))
                        .fail(piggy.callFailed(api.url, api.data));
                },
                function() { 
                    piggy.callFailed(api.url, api.data);
                });
            }
            else { 
                piggy.last = call;
                call
                    .done(piggy.callPassed(api.url, api.data))
                    .fail(piggy.callFailed(api.url, api.data));
            }

        });
        return piggy.deferred.promise();
    };

    this.makeCallsSynchronously = function() { 
        piggy.cookieClear();
        var m = this.builder(0, $.Deferred());
        return m;
    };

    this.cookieClear = function() {
        if($.removeCookie === undefined)
            throw "cookie lib jquery.cookie.js missing";
        var cookies = document.cookie.split(";");
        for (var i=0; i < cookies.length; i++) { 
            var cookie = cookies[i];
            var eqPos = cookie.indexOf("=");
            var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            $.removeCookie(name);
        }
        piggy.logger("Cleared down " + cookies.length + " cookies");
    };

    this.builder = function(index, deferred, lastResult) { 

        var apiCallData = piggy.queue[index];

        if(lastResult !== undefined) { 
            piggy.postResult(lastResult, piggy.queue[index-1].data );
        }
        else { 
            piggy.deferred = $.Deferred();
        }

        if(index === piggy.queue.length) { 
            this.deferred.resolve(piggy.results);
        }
        else { 
            deferred.then( 
                function() { 
                    piggy.ajaxCall(apiCallData).then(processAjaxPass, processAjaxFail);
                }
            );
            deferred.resolve();
        }
        return piggy.deferred.promise();

        function processAjaxPass(data, textStatus, jqXHR) { 
            processAjaxPassorFail(data, textStatus, null, jqXHR);
        };

        function processAjaxFail(jqXHR, textStatus, errorThrown) { 
            processAjaxPassorFail({}, textStatus, errorThrown, jqXHR);
        };

        function processAjaxPassorFail(data, textStatus, errorThrown, jqXHR) { 

            apiCallData.outcome.timer.end = Date.now();
            apiCallData.outcome.timer.latency = apiCallData.outcome.timer.end - apiCallData.outcome.timer.start;

            if(apiCallData.data.expectation.response === undefined) { 
                piggy.logger("- Continuing calls. No expected response set for " + apiCallData.data.name);
                continueTestCycle(jqXHR);
            }
            else {
                if(jqXHR.status !== apiCallData.data.expectation.response) { 
                    piggy.logger("* Received unexpected response for " + apiCallData.data.name);
                    piggy.logger("* >> Expected " + apiCallData.data.expectation.response);
                    piggy.logger("* << Received " + jqXHR.status);

                    if(piggy.stopOnSurprise)
                        quitTestCycle(jqXHR, apiCallData.data);
                    else
                        continueTestCycle(jqXHR);
                }
                else { 
                    continueTestCycle(jqXHR);
                }
            }
            
        };

        function quitTestCycle(xhr, callData) { 
            piggy.status(false);
            piggy.logger("< Res: " + xhr.status);
            piggy.postResult(xhr, callData);
            piggy.deferred.resolve(piggy.results);
            piggy.allDone = true;
        };

        function continueTestCycle(xhr) { 
            if(piggy.allDone === true) {
                piggy.logger("* Ending test cycle");
            }
            else { 
                piggy.status(true);
                piggy.logger("< Res: " + xhr.status);
                next = $.Deferred();                     // future object for this test
                piggy.builder(++index, next, xhr);       // all the other tests that must come first
                next.resolve();                          // resolve this test
            }
        };

    };

    this.ajaxCall = function(apiData) { 

        var config = { 
            type: apiData.data.method,
            headers: {},
            timeout: piggy.timeout
        };

        /**
         *  Interpolate uri-template for URLs of the form "/blah/{this}/{that}"
         *
         *  urldata is one of: 
         *      - object containing matching keys to those described in the template
         *      - recall object
        **/

        if(apiData.url.search(/{.*?}/) !== -1) { 
            if(apiData.data.urldata !== undefined) { 
                if(UriTemplate === undefined) throw "URI Template used but no lib found";
                if(typeof(apiData.data.urldata) !== 'object') throw "urldata must be a JS object, got " + typeof(apiData.data.urldata)
                var template = UriTemplate.parse(apiData.url);
                if(apiData.data.urldata.recall !== undefined) { 
                    var urldata = resolve(piggy.memory, apiData.data.urldata.recall);
                }
                else { 
                    var urldata = apiData.data.urldata;
                }
                var urlEnding = template.expand(urldata);
                config.url = piggy.root + urlEnding;
                apiData.url = urlEnding;
                piggy.logger(" Expanded URL " + apiData.url + " to " + config.url);
                piggy.logger(" Using        " + JSON.stringify(urldata));
            }
            else { 
                config.url = piggy.root + apiData.url;
                piggy.logger("WARNING: URI Template (" + apiData.url + ") but no urldata");
            }
        }
        else { 
            config.url = piggy.root + apiData.url;
        }

        /**
         *  Add request body
        **/

        if(apiData.data.body !== undefined) { 
            if(Object.keys(apiData.data.body).length === 1 && apiData.data.body.recall !== undefined) { 
                piggy.logger("Recalling request body data from " + apiData.data.body.recall);
                config.data = resolve(piggy.memory, apiData.data.body.recall);
                if(config.data === undefined)
                    piggy.logger("* Unable to resolve " + apiData.data.body.recall);
            }
            else{
                piggy.logger("Setting request body data");
                config.data = JSON.stringify(apiData.data.body);
            }
            piggy.logger("Body set to " + config.data);
        }

        /**
         *  Add cookies
        **/

        if(apiData.data.cookies !== undefined) { 
            if($.cookie === undefined) throw "cookie lib jquery.cookie.js missing";
            Object.keys(apiData.data.cookies).forEach( 
                function(c) { 
                    if(typeof(apiData.data.cookies[c]) === 'object') { 
                        try { 
                            apiData.data.cookies[c] = resolve(piggy.memory, apiData.data.cookies[c].recall);
                        }
                        catch(e) { 
                            piggy.logger("Could not resolve " + apiData.data.cookies[c].recall);
                            return;
                        }
                    }
                    $.cookie(c, apiData.data.cookies[c], { path: '/' });
                }
            );
            var cookies = [];
            document.cookie.split(";").forEach(function(c) { cookies.push(c) });
            piggy.logger("Set " + document.cookie.split(";").length + " cookies [" + cookies.join(",") + "]");
        }

        // Add form encoded header and reformat request body

        if(apiData.data.encoding !== undefined) { 
            if(apiData.data.encoding === 'form' && apiData.data.body !== undefined) { 
                config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                config.data = "";
                Object.keys(apiData.data.body).forEach( 
                    function(key) { 
                        config.data += key + "=" + encodeURIComponent(apiData.data.body[key]) + "&"
                    }
                );
                config.data = config.data.substring(0, config.data.length - 1);
                apiData.data.body = config.data;
            }
        }

        // Add client IP to header

        if(apiData.data.clientIP !== undefined) { 
            piggy.logger("Using fake IP " + apiData.data.clientIP);
            config.headers['client-ip'] = apiData.data.clientIP;
        }

        apiData.outcome = {
            timer: {
                start: Date.now()
            }
        };

        if(apiData.data.name !== undefined) { 
            //console.log(apiData);
            piggy.logger("API Name: " + apiData.data.name + " " + (apiData.data.desc === undefined ? "" : apiData.data.desc));
        }

        piggy.logger("> Req: '" + config.url + "' with method '" + config.type + "'");

        if(apiData.data.expectation !== undefined)
            piggy.logger("- Exp: " + apiData.data.expectation.response);
        return $.ajax(config);
    };

    this.callPassed = function(url, callData) { 
        return function(data, textStatus, jqXHR) { 
            piggy.postResultAndCheckProgress(jqXHR, callData);
        };
    };

    this.callFailed = function(url, callData) { 
        return function(jqXHR, textStatus, errorThrown) { 
            piggy.postResultAndCheckProgress(jqXHR, callData);
        };
    };

    /**
     *  Add result to list
    **/

    this.postResult = function(result, callData) { 

        var apiCallId     = callData.id;
        var apiData       = piggy.queue[apiCallId];
        var resultSummary = piggy.results['summary'];

        apiResults = { 
            id: apiCallId,
            url: apiData.url,
            method: callData.method,
            callData: callData,
            outcome: apiData.outcome
        };

        if(apiData.data.expectation !== undefined) { 

            apiResults.expectation = apiData.data.expectation;

            apiResults.outcome.response = { 
                received: result.status, 
                text: result.statusText
            };

            if(result.status === apiResults.expectation.response) { 
                apiResults.outcome.response.expectationMet = true;
                resultSummary.passes.push(callData.id);
                if(resultSummary.passed === null) { 
                    resultSummary.passed = true;
                }
            }
            else {
                apiResults.outcome.response.expectationMet = false;
                resultSummary.fails.push(callData.id);
                resultSummary.passed = false;
            }

            if(apiResults.expectation.schema !== undefined) { 
                if(tv4 !== undefined) { 
                    try { 
                        var json = JSON.parse(result.responseText);
                        var validation = tv4.validateMultiple(json, apiResults.expectation.schema);
                    }
                    catch(e) { 
                        var problem = "Invalid JSON (" + result.responseText + ") received from server";
                        var validation = problem;
                    }
                    apiResults.outcome.schema = validation;
                    apiResults.outcome.schema.expectationMet = (apiResults.outcome.schema.valid === true) ? true : false;
                }
                else {
                    piggy.logger("schema expectation set but tv4 lib not included in page");
                }
            }

            if(apiResults.expectation.latency !== undefined) {
                apiResults.outcome.timer.difference = parseInt(apiResults.outcome.timer.latency) - parseInt(apiResults.expectation.latency);
                if(apiResults.expectation.latency >= apiResults.outcome.timer.latency) { 
                    apiResults.outcome.timer.expectationMet = true;
                }
                else { 
                    apiResults.outcome.timer.expectationMet = false;
                }
            }

            //delete apiResults.callData.expectation;
        }
        else { 
            apiResults.expectation = { };
        }

        if(callData.remember !== undefined) { 
            piggy.logger("Remembering response in " + callData.remember);
            if(result.responseJSON === undefined)
                var memory = result.responseText;
            else
                var memory = result.responseJSON;
            try { 
                if(typeof(memory) === 'string')
                    memory = JSON.parse(memory);
            }
            catch(e) { 
                piggy.logger("Could not parse response string as JSON Object");
            }
            piggy.memory[callData.remember] = memory;
            callData[callData.remember] = memory;
            piggy.logger("Memory contains " + (JSON.stringify(piggy.memory[callData.remember])));
            //console.log(memory);
        }

        piggy.results[apiCallId] = apiResults;

    };

    /**
     *  Add result to list and check if all results are in
    **/

    this.postResultAndCheckProgress = function(result, callData) { 
        this.postResult(result, callData);
        if(piggy.queue.length === Object.keys(piggy.results).length) {
            piggy.deferred.resolve(piggy.results);
        }
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
                piggy.logger("Unable to resolve " + path);
                return undefined;
            }
        }
        return result;
    };

};