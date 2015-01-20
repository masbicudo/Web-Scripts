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

    function CreateRouter(o) {
        if (typeof o == 'undefined')
            return function CreateRouter() {
                this.step("CreateRouter");
                return this.router = new Router();
            };
        else
            return function CreateRouter() {
                this.step("CreateRouter: " + JSON.stringify(o));
                return this.router = new Router(o);
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

        var allTests =
            alternate(
                sequence(
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
                sequence(
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
                sequence(
                    CreateRouter(),
                    AddRoute({
                        UriPattern: "{controller}/{action}/{id}",
                        Defaults: { controller: "Home", action: "Index", id: null } }),
                    alternate(
                        GetRouteDataFromUri("~/Home//20"),
                        GetRouteDataFromUri("~//Index/20"),
                        GetRouteDataFromUri("~///20")
                    ),
                    test("middle missing parameter", function(r) {
                        this.assert(function() {
                            return r.error === "Match failed: missing segments may only appear at end";
                        });
                    })
                ),
                sequence(
                    CreateRouter(),
                    AddRoute({
                        UriPattern: "Schedule/{date}/{id}",
                        Defaults: { controller: "Schedule", action: "Index", id: null },
                        Constraints: { date: "\\d{4}-\\d\\d-\\d\\d" } }),
                    alternate(
                        GetRouteDataFromUri("~/Schedule/2015-01-17"),
                        GetRouteDataFromUri("~/Schedule/2015-01-17/"),
                        GetRouteDataFromUri("~/Schedule/2015-01-17/20")
                    ),
                    writeError('log'),
                    logProps(),
                    test("constraint fail", function(r) {
                        this.assert(function() {
                            return r.data.controller == "Schedule" && r.data.action == "Index" && r.data.date == '2015-01-17';
                        });
                    })
                ),
                sequence(
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
                sequence(
                    CreateRouter(),
                    catchError(alternate(
                        AddRoute({ UriPattern: "Schedule/{{id}" }),
                        AddRoute({ UriPattern: "Schedule/{id}}" })
                    )),
                    writeError('log'),
                    logProps(),
                    test("syntax error", function(err) {
                        this.assert(function() {
                            return err instanceof Error && err.type == "SYNTAX_ERROR";
                        });
                    })
                ),
                sequence(
                    CreateRouter(),
                    catchError(alternate(
                        AddRoute({ UriPattern: "Schedule//" }),
                        AddRoute({ UriPattern: "Schedule//{id}" })
                    )),
                    writeError('log'),
                    logProps(),
                    test("empty segment", function(err) {
                        this.assert(function() {
                            return err instanceof Error && err.type == "EMPTY_SEGMENT";
                        });
                    })
                ),
                sequence(
                    CreateRouter(),
                    catchError(alternate(
                        AddRoute({ UriPattern: "Schedule/{}" }),
                        AddRoute({ UriPattern: "Schedule/{}/" })
                    )),
                    writeError('log'),
                    test("place-holder without name", function(err) {
                        this.assert(function() {
                            return err instanceof Error && err.type == "UNNAMED_PLACEHOLDER";
                        });
                    })
                ),
                sequence(
                    CreateRouter(),
                    catchError(alternate(
                        AddRoute({ UriPattern: "Schedule/{year}{month}{day}" }),
                        AddRoute({ UriPattern: "Schedule/{year}{month}{day}/{id}" }),
                        AddRoute({ UriPattern: "{year}{month}{day}" })
                    )),
                    writeError('log'),
                    test("no adjacent place-holders", function(err) {
                        this.assert(function() {
                            return err instanceof Error && err.type == "ADJACENT_PLACEHOLDERS";
                        });
                    })
                ),
                sequence(
                    CreateRouter(),
                    catchError(alternate(
                        AddRoute({ UriPattern: "Schedule/{id}/{id}" }),
                        AddRoute({ UriPattern: "Schedule/{id}-{id}" }),
                        AddRoute({ UriPattern: "Schedule/{name}-{id}/{name}/{id}" })
                    )),
                    writeError('log'),
                    test("duplicate place-holders", function(err) {
                        this.assert(function() {
                            return err instanceof Error && err.type == "DUPLICATE_PLACEHOLDER";
                        });
                    })
                ),
                sequence(
                    CreateRouter(),
                    AddRoute({ UriPattern: "Schedule/{name}-{id}/{xpto}", Defaults: { name: null, id: null, xpto: null } }),
                    alternate(
                        GetRouteDataFromUri("~/Schedule/-12"),
                        GetRouteDataFromUri("~/Schedule/Miguel-"),
                        //GetRouteDataFromUri("~/Schedule/Miguel"), // this is allowed!
                        GetRouteDataFromUri("~/Schedule/-12/any"),
                        GetRouteDataFromUri("~/Schedule/Miguel-/any"),
                        GetRouteDataFromUri("~/Schedule/Miguel/any"), // this is not allowed
                        GetRouteDataFromUri("~/Schedule/-/any") // this is not allowed
                    ),
                    writeError('log'),
                    test("segment is partially filled", function(r) {
                        this.assert(function() {
                            return r.error == "Match failed: segment is partially filled";
                        });
                    })
                ),
                sequence(
                    CreateRouter(),
                    alternate(
                        sequence(
                            AddRoute({ UriPattern: "Schedule/{name}-{id}/{xpto}", Defaults: { name: null, id: null, xpto: null } }),
                            GetRouteDataFromUri("~/Schedule/Miguel") // this is allowed!
                        ),
                        sequence(
                            AddRoute({ UriPattern: "Schedule/{name}-{id}/seg/{xpto}", Defaults: { name: null, id: null, xpto: null } }),
                            GetRouteDataFromUri("~/Schedule/Miguel") // this is allowed!
                        )
                    ),
                    writeError('log'),
                    test("valid segments (advanced)", function(r) {
                        this.assert(function() {
                            return r.error == "Match failed: segment is partially filled";
                        });
                    })
                )
            );

        doSomeTests(allTests);
    }
    finally {
        markersEx.disableMarkers();
    }

    return testResults;
}
