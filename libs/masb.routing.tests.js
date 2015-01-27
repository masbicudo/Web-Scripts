// Routing Tests v0.1.0    2015-01-16
//  author: Miguel Angelo
//  require: masb.routing.v0.1.0.js
//  require: masb.flow.graph.v1.5.0.js
//  require: masb.tests.v1.0.0.js
//  require: masb.tests.ex.v1.0.0.js
function doRoutingTests(graphFlow, TestClass)
{
    var tester = new TestClass(),
        test = tester.test.bind(tester),
        log = tester.log.bind(tester),
        assert = tester.assert.bind(tester);

    function HashObj(obj) {
        return JSON.stringify(obj)
            .replace(/[^\w\d]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    function catchError(fn) {
        fn.combinator = graphFlow.combinators.catchCombinator;
        return fn;
    }
    
    function logProps() {
        return function logProps(o) {
            if (o === null) this.log("null");
            if (typeof o === 'undefined') this.log("undefined");
            for (var k in o)
                this.log(k + " = " + (typeof o[k] === 'undefined' ? o[k] : JSON.stringify(o[k])));
            return o;
        }
    }
    
    function writeError(t) {
        return function writeError(o) {
            if (o instanceof Error)
                this[t](o.message);
            return o;
        };
    }

    function CreateRouter() {
        return function CreateRouter() {
            var globals = { area: null };
            this.step("CreateRouter: globals = " + JSON.stringify(globals));
            return this.router = new Router([], globals);
        };
    }

    function AddRoute(o) {
        return function AddRoute() {
            this.step("AddRoute: " + JSON.stringify(o));
            return this.router.addRoute(null, o);
        };
    }

    function GetRouteDataFromUri(uri) {
        return function GetRouteDataFromUri() {
            this.step("GetRouteDataFromUri: " + uri);
            return this.routeData = this.router.getRouteDataFromURI(uri);
        };
    }
    
    function SetCurrentData(current) {
        return function SetCurrentData(x) {
            this.step("SetCurrentData: " + JSON.stringify(current));
            this.currentData = current;
            return x;
        };
    }
    
    function BuildURI(target) {
        return function BuildURI() {
            this.step("BuildURI: " + JSON.stringify(target));
            this.target = target;
            var result = this.router.getURIFromRouteData(this.currentData, target);
            return result;
        };
    }
    
    function catchEx(fn) {
        return function catchEx() {
            var err = null;
            try { fn.apply(this, arguments); }
            catch (e) { err = e; }
            return err;
        };
    }

    var testResults = [];
    function doSomeTests(tests) {
        tests.createContext = tester.testContextCreator;
        var result = tests.callAll();
        testResults.push(result);
    }

    var markersEx = gfexEnableMarkers(graphFlow);
    try {

        var nop = graphFlow.NoOp,
            sequence = graphFlow.sequence,
            alternate = graphFlow.alternate,
            combine = graphFlow.combine,
            marker = graphFlow.marker,
            acceptMarker = graphFlow.acceptMarker;

        var tests = {
            routeWithDefault: sequence(
                CreateRouter(),
                alternate(
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", action: "Index", id: null } }),
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", id: null } }),
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { action: "Index", id: null } }),
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { id: null } })
                ),
                alternate(
                    GetRouteDataFromUri("~/Home/Index/"),
                    GetRouteDataFromUri("~/Home/Index")
                ),
                logProps(),
                writeError('warn'),
                test("route data with default value", function(r) {
                    this.assert(function() {
                        return r.data.controller == "Home" && r.data.action == "Index" && typeof r.data.id == 'undefined';
                    });
                })
            ),
            noValueNoDefault: sequence(
                CreateRouter(),
                alternate(
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", action: "Index" } }),
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home" } }),
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { action: "Index" } }),
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { } })
                ),
                alternate(
                    GetRouteDataFromUri("~/Home/Index/"),
                    GetRouteDataFromUri("~/Home/Index")
                ),
                logProps(),
                test("no value and no default {id}", function(r) {
                    this.assert(function() {
                        return r.error === "Match failed: no value and no default for '{id}'";
                    });
                })
            ),
            missingMiddle: sequence(
                CreateRouter(),
                alternate(
                    sequence(
                        AddRoute({
                            UriPattern: "{controller}/{action}/{id}",
                            Defaults: { controller: "Home", action: "Index", id: null } }),
                        alternate(
                            GetRouteDataFromUri("~/Home//20"),
                            GetRouteDataFromUri("~//Index/20"),
                            GetRouteDataFromUri("~///20")
                        )
                    )
                ),
                logProps(),
                writeError('log'),
                test("middle missing parameter", function(r) {
                    this.assert(function() {
                        return r.error === "Match failed: missing segments may only appear at end";
                    });
                })
            ),
            constraintFail: sequence(
                CreateRouter(),
                alternate(
                    AddRoute({
                        UriPattern: "Schedule/{date}/{id}",
                        Defaults: { controller: "Schedule", action: "Index", id: null },
                        Constraints: { date: "^\\d{4}-\\d\\d-\\d\\d$" } }),
                    AddRoute({
                        UriPattern: "Schedule/{date}/{id}",
                        Defaults: { controller: "Schedule", action: "Index", id: null },
                        Constraints: { date: function(val,ctx) { return /^\d{4}-\d\d-\d\d$/g.test(val); } } })
                ),
                alternate(
                    GetRouteDataFromUri("~/Schedule/2015-01-m7"),
                    GetRouteDataFromUri("~/Schedule/2015-m1-17/"),
                    GetRouteDataFromUri("~/Schedule/m015-01-17/20")
                ),
                writeError('log'),
                logProps(),
                test("constraint fail", function(r) {
                    this.assert(function() {
                        return r.error == "Match failed: constraint of '{date}' did not match";;
                    });
                })
            ),
            matchBraces: sequence(
                CreateRouter(),
                alternate(
                    sequence(
                        AddRoute({ UriPattern: "Schedule/{{id}}" }),
                        GetRouteDataFromUri("~/Schedule/{id}")
                    ),
                    sequence(
                        AddRoute({ UriPattern: "Schedule/{{id" }),
                        GetRouteDataFromUri("~/Schedule/{id")
                    ),
                    sequence(
                        AddRoute({ UriPattern: "Schedule/id}}" }),
                        GetRouteDataFromUri("~/Schedule/id}")
                    )
                ),
                writeError('log'),
                logProps(),
                test("match literal with '{' and '}'", function(r) {
                    this.assert(function() {
                        return r.data != null;
                    });
                })
            ),
            syntaxErrors: sequence(
                CreateRouter(),
                catchError(alternate(
                    AddRoute({ UriPattern: "Schedule/{{id}" }),
                    AddRoute({ UriPattern: "Schedule/{id}}" })
                )),
                writeError('log'),
                logProps(),
                test("syntax error", function(d) {
                    this.assert(function() {
                        return d.error instanceof Error && d.error.type == "SYNTAX_ERROR";
                    });
                })
            ),
            emptySegment: sequence(
                CreateRouter(),
                catchError(alternate(
                    AddRoute({ UriPattern: "Schedule//" }),
                    AddRoute({ UriPattern: "Schedule//{id}" })
                )),
                writeError('log'),
                logProps(),
                test("empty segment", function(d) {
                    this.assert(function() {
                        return d.error instanceof Error && d.error.type == "EMPTY_SEGMENT";
                    });
                })
            ),
            unnamedPlaceholder: sequence(
                CreateRouter(),
                catchError(alternate(
                    AddRoute({ UriPattern: "Schedule/{}" }),
                    AddRoute({ UriPattern: "Schedule/{}/" })
                )),
                writeError('log'),
                test("place-holder without name", function(d) {
                    this.assert(function() {
                        return d.error instanceof Error && d.error.type == "UNNAMED_PLACEHOLDER";
                    });
                })
            ),
            adjacentPlaceholders: sequence(
                CreateRouter(),
                catchError(alternate(
                    AddRoute({ UriPattern: "Schedule/{year}{month}{day}" }),
                    AddRoute({ UriPattern: "Schedule/{year}{month}{day}/{id}" }),
                    AddRoute({ UriPattern: "{year}{month}{day}" })
                )),
                writeError('log'),
                test("no adjacent place-holders", function(d) {
                    this.assert(function() {
                        return d.error instanceof Error && d.error.type == "ADJACENT_PLACEHOLDERS";
                    });
                })
            ),
            duplicatePlaceholders: sequence(
                CreateRouter(),
                catchError(alternate(
                    AddRoute({ UriPattern: "Schedule/{id}/{id}" }),
                    AddRoute({ UriPattern: "Schedule/{id}-{id}" }),
                    AddRoute({ UriPattern: "Schedule/{name}-{id}/{name}/{id}" })
                )),
                writeError('log'),
                test("duplicate place-holders", function(d) {
                    this.assert(function() {
                        return d.error instanceof Error && d.error.type == "DUPLICATE_PLACEHOLDER";
                    });
                })
            ),
            segmentPartiallyFilled: sequence(
                CreateRouter(),
                alternate(
                    sequence(
                        AddRoute({ UriPattern: "Schedule/{name}-{id}/{xpto}", Defaults: { name: null, id: null, xpto: null } }),
                        alternate(
                            GetRouteDataFromUri("~/Schedule/Miguel-"),
                            GetRouteDataFromUri("~/Schedule/-/"),
                            GetRouteDataFromUri("~/Schedule/-12/any"),
                            GetRouteDataFromUri("~/Schedule/Miguel-/any"),
                            GetRouteDataFromUri("~/Schedule/-12"),
                            GetRouteDataFromUri("~/Schedule/-/any")
                        )
                    ),
                    sequence(
                        AddRoute({ UriPattern: "File/{name}-{type}", Defaults: { name: null, type: null } }),
                        alternate(
                            GetRouteDataFromUri("~/File/fileName-"),
                            GetRouteDataFromUri("~/File/-txt"),
                            GetRouteDataFromUri("~/File/-")
                        )
                    )
                ),
                logProps(),
                writeError('log'),
                test("segment is partially filled", function(r) {
                    this.assert(function() {
                        return r.error == "Match failed: segment is partially filled";
                    });
                })
            ),
            missingLiteral: sequence(
                CreateRouter(),
                alternate(
                    sequence(
                        AddRoute({ UriPattern: "Schedule/{name}-{id}/{xpto}", Defaults: { name: null, id: null, xpto: null } }),
                        alternate(
                            GetRouteDataFromUri("~/Schedule/Miguel"),
                            GetRouteDataFromUri("~/Schedule//any"),
                            GetRouteDataFromUri("~/Schedule/Miguel/any")
                        )
                    ),
                    sequence(
                        AddRoute({ UriPattern: "File/{name}-{type}", Defaults: { name: null, type: null } }),
                        alternate(
                            GetRouteDataFromUri("~/File/fileName")
                        )
                    )
                ),
                logProps(),
                writeError('log'),
                test("missing literal", function(r) {
                    this.assert(function() {
                        return r.error == "Match failed: literal cannot be missing '-'";
                    });
                })
            ),
            discrepancies: sequence(
                CreateRouter(),
                alternate(
                    sequence(
                        AddRoute({ UriPattern: "{x}-{y}", Defaults: { } }),
                        GetRouteDataFromUri("~/x-y-z"),
                        logProps(),
                        writeError('log'),
                        test("discrepancy #1", function(r) {
                            this.assert(function() {
                                return r.data.x == 'x' && r.data.y == 'y-z';
                            });
                        })
                    ),
                    sequence(
                        AddRoute({ UriPattern: "{x}-{y}", Defaults: { x: null } }),
                        GetRouteDataFromUri('~/---'),
                        logProps(),
                        writeError('log'),
                        test("discrepancy #2", function(r) {
                            this.assert(function() {
                                return r.error == "Match failed: segment is partially filled";
                            });
                        })
                    )
                )
            ),
            buildUri: sequence(
                CreateRouter(),
                AddRoute({ UriPattern: "App/{controller}/{action}/{id}", Defaults: { id: null, area: "App" } }),
                AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", action: "Index", id: null } }),
                alternate(
                    SetCurrentData({ area: "App", controller: "Schedule", action: "Index" }),
                    SetCurrentData({ controller: "Schedule", action: "Index" }),
                    SetCurrentData({ controller: "Home", action: "Index" })
                ),
                alternate(
                    sequence(
                        BuildURI({ area: "App", controller: "Schedule", action: "Details", id: "10" }),
                        writeError('log'),
                        test("build URI with area", function(uri) {
                            this.assert(function() {
                                return uri == "~/App/Schedule/Details/10";
                            });
                        })
                    ),
                    sequence(
                        BuildURI({ area: "App", controller: "Schedule", action: "Details", id: "10", name: "Miguel Angelo", age: 30 }),
                        writeError('log'),
                        test("build URI with query string", function(uri) {
                            this.log(uri);
                            this.assert(function() {
                                return uri == "~/App/Schedule/Details/10?name=Miguel%20Angelo&age=30"
                                    || uri == "~/App/Schedule/Details/10?age=30&name=Miguel%20Angelo";
                            });
                        })
                    ),
                    sequence(
                        BuildURI({ area: "", controller: "Home", action: "Details", id: "10" }),
                        writeError('log'),
                        test("build URI for default area", function(uri) {
                            this.log(uri);
                            this.assert(function() {
                                return uri == "~/Home/Details/10";
                            });
                        })
                    ),
                    sequence(
                        //
                        BuildURI({ controller: "Home", action: "Details", id: "10" }),
                        writeError('log'),
                        test("build URI keeping area", function(uri) {
                            this.log(uri);
                            var c = this.currentData;
                            if (c.area == "App")
                                this.assert(function() {
                                    return uri == "~/App/Home/Details/10";
                                });
                            else
                                this.assert(function() {
                                    return uri == "~/Home/Details/10";
                                });
                        })
                    ),
                    sequence(
                        null, // counter the catchCombinator bug... it shouldn't be a combinator
                        catchError(alternate(
                            BuildURI({ action: "Details", id: "10" })
                        )),
                        writeError('log'),
                        test("build URI keeping area, controller", function(d) {
                            this.log(JSON.stringify(d));
                            var c = this.currentData;
                            if (c.controller == "Home")
                                this.assert(function() {
                                    return d.value == "~/Home/Details/10";
                                });
                            else if (c.area == "App" && c.controller == "Schedule")
                                this.assert(function() {
                                    return d.value == "~/App/Schedule/Details/10";
                                });
                            else if (c.controller == "Schedule")
                                this.assert(function() {
                                    return d.value == "~/Schedule/Details/10";
                                });
                        })
                    )
                )
            )
        };

        doSomeTests(alternate(
                tests.routeWithDefault,
                tests.noValueNoDefault,
                tests.missingMiddle,
                tests.constraintFail,
                tests.matchBraces,
                tests.syntaxErrors,
                tests.emptySegment,
                tests.unnamedPlaceholder,
                tests.adjacentPlaceholders,
                tests.duplicatePlaceholders,
                tests.segmentPartiallyFilled,
                tests.missingLiteral,
                tests.discrepancies,
                undefined // no test at all
            ));

        doSomeTests(alternate(
                tests.buildUri,
                undefined // no test at all
            ));
    }
    finally {
        markersEx.disableMarkers();
    }

    return testResults;
}
