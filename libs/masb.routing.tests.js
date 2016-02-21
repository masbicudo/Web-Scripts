// Routing Tests v0.1.1    2015-01-16
//  author: Miguel Angelo
//  require: masb.routing.v0.2.2.js
//  require: masb.tests.v1.0.0.js
//  require: masb.tests.ex.v1.0.0.js
//  require: masb.flow.graph.v1.7.2.js
"use strict";
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
        fn.transformers = [graphFlow.transformers.catchTransformer];
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

    function CreateRouter(routes) {
        if (routes instanceof Array);
        else if (routes && typeof routes.UriPattern == 'string') routes = [routes];
        else routes = [];
        return function CreateRouter() {
            var globals = { area: null };
            this.step("CreateRouter: globals = " + JSON.stringify(globals) + "; routes = " + JSON.stringify(routes));
            return this.router = new Router({routes: routes, globals: globals, basePath: 'MyApp'});
        };
    }

    function CreateRouterWithLocationMixin() {
        return function CreateRouter() {
            var globals = { area: null };
            this.step("CreateRouterWithLocationMixin: globals = " + JSON.stringify(globals));
            return this.router = new Router({
                routes: [],
                globals: globals,
                basePath: 'MyApp',
                // this mix-in tracks the current current location internally
                mixins: [routerMixins.location] });
        };
    }

    function AddRoute(o) {
        return function AddRoute() {
            this.step("AddRoute: " + JSON.stringify(o));
            this.lastRoute = o;
            return this.router.addRoute(null, o);
        };
    }

    function GetRouteMatchFromUri(uri) {
        return function GetRouteMatchFromUri() {
            this.step("GetRouteMatchFromUri: " + uri);
            return this.routeMatch = this.router.matchRoute(uri, {verbose:true});
        };
    }

    function SetCurrentData(current) {
        return function SetCurrentData(x) {
            this.step("SetCurrentData: " + JSON.stringify(current));
            this.currentData = current;
            return x;
        };
    }

    function SetLocationMixinCurrentData(current) {
        return function SetLocationMixinCurrentData(x) {
            this.step("SetLocationMixinCurrentData: " + JSON.stringify(current));
            this.router.setCurrentLocation(current);
            return x;
        };
    }

    function BuildURI(target) {
        return function BuildURI() {
            this.step("BuildURI: " + JSON.stringify(target));
            this.target = target;
            var result = this.router.makeURI(this.currentData, target, {virtual: true});
            return result;
        };
    }

    function LocationMixin_BuildURI(target, opts) {
        return function LocationMixin_BuildURI() {
            this.step("LocationMixin_BuildURI: " + JSON.stringify(target));
            this.target = target;
            var result = opts
                ? this.router.makeURI(target, opts)
                : this.router.makeURI(target);
            return result;
        };
    }

    function LocationMixin_BuildURIVirt(target) {
        return LocationMixin_BuildURI(target, {virtual: true});
    }

    function BuildApplicationURI(target) {
        return function BuildURI() {
            this.step("BuildApplicationURI: " + JSON.stringify(target));
            this.target = target;
            var result = this.router.makeURI(this.currentData, target);
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

    function getTestFunctions(tests) {
        tests.createContext = tester.testContextCreator;
        return tests.getCallers();
    }

    var testEx = tester.setupGraphFlow();
    var markersEx = gfexEnableMarkers(graphFlow);
    try {

        var nop = graphFlow.NoOp,
            sequence = graphFlow.sequence,
            alternate = graphFlow.alternate,
            combine = graphFlow.combine,
            marker = graphFlow.marker,
            acceptMarker = graphFlow.acceptMarker;

        var tests = {
            /**/
            routeWithDefault: sequence(
                alternate(
                    sequence(
                        CreateRouter(),
                        alternate(
                            AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", action: "Index", id: "" } }),
                            AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", id: "" } }),
                            AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { action: "Index", id: "" } }),
                            AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { id: "" } })
                        )
                    ),
                    CreateRouter({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", action: "Index", id: "" } }),
                    CreateRouter({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", id: "" } }),
                    CreateRouter({ UriPattern: "{controller}/{action}/{id}", Defaults: { action: "Index", id: "" } }),
                    CreateRouter({ UriPattern: "{controller}/{action}/{id}", Defaults: { id: "" } })
                ),
                alternate(
                    GetRouteMatchFromUri("~/Home/Index/"),
                    GetRouteMatchFromUri("~/Home/Index")
                ),
                logProps(),
                writeError('warn'),
                test("route data with default value", function(r) {
                    this.assert(function() {
                        return r.data.controller == "Home" && r.data.action == "Index" && r.data.id == "";
                    });
                })
            ),
            routeGetFromApplicationUri: sequence(
                CreateRouter(),
                alternate(
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", action: "Index", id: "" } }),
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", id: "" } }),
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { action: "Index", id: "" } }),
                    AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { id: "" } })
                ),
                alternate(
                    GetRouteMatchFromUri("/MyApp/Home/Index/"),
                    GetRouteMatchFromUri("/MyApp/Home/Index")
                ),
                logProps(),
                writeError('warn'),
                test("route data from application uri", function(r) {
                    this.assert(function() {
                        return r.data.controller == "Home" && r.data.action == "Index" && r.data.id == "";
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
                    GetRouteMatchFromUri("~/Home/Index/"),
                    GetRouteMatchFromUri("~/Home/Index")
                ),
                logProps(),
                test("no value and no default {id}", function(r) {
                    this.assert(function() {
                        return r.error && 0 <= r.details.indexOf("Match failed: no value and no default for '{id}'");
                    });
                })
            ),
            missingMiddle: sequence(
                CreateRouter(),
                alternate(
                    sequence(
                        AddRoute({
                            UriPattern: "{controller}/{action}/{id}",
                            Defaults: { controller: "Home", action: "Index", id: "" } }),
                        alternate(
                            GetRouteMatchFromUri("~/Home//20"),
                            GetRouteMatchFromUri("~//Index/20"),
                            GetRouteMatchFromUri("~///20")
                        )
                    )
                ),
                logProps(),
                writeError('log'),
                test("middle missing parameter", function(r) {
                    this.assert(function() {
                        return r.error && 0 <= r.details.indexOf("Match failed: missing segments may only appear at end");
                    });
                })
            ),
            constraintFail: sequence(
                CreateRouter(),
                alternate(
                    AddRoute({
                        UriPattern: "Schedule/{date}/{id}",
                        Defaults: { controller: "Schedule", action: "Index", id: "" },
                        Constraints: { date: "^\\d{4}-\\d\\d-\\d\\d$" } }),
                    AddRoute({
                        UriPattern: "Schedule/{date}/{id}",
                        Defaults: { controller: "Schedule", action: "Index", id: "" },
                        Constraints: { date: function(val,ctx) { return /^\d{4}-\d\d-\d\d$/g.test(val); } } })
                ),
                alternate(
                    GetRouteMatchFromUri("~/Schedule/2015-01-m7"),
                    GetRouteMatchFromUri("~/Schedule/2015-m1-17/"),
                    GetRouteMatchFromUri("~/Schedule/m015-01-17/20")
                ),
                writeError('log'),
                logProps(),
                test("constraint fail", function(r) {
                    this.assert(function() {
                        return r.error && 0 <= r.details.indexOf("Match failed: constraint of '{date}' did not match");
                    });
                })
            ),
            matchBraces: sequence(
                CreateRouter(),
                alternate(
                    sequence(
                        AddRoute({ UriPattern: "Schedule/{{id}}" }),
                        GetRouteMatchFromUri("~/Schedule/{id}")
                    ),
                    sequence(
                        AddRoute({ UriPattern: "Schedule/{{id" }),
                        GetRouteMatchFromUri("~/Schedule/{id")
                    ),
                    sequence(
                        AddRoute({ UriPattern: "Schedule/id}}" }),
                        GetRouteMatchFromUri("~/Schedule/id}")
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
            routeValuesCannotBeNull: sequence(
                // for now, ASP.NET does not use null values in the values
                // only empty strings will be accepted.
                catchError(alternate(
                    CreateRouter({ UriPattern: "Home", Defaults: { id: null } }),
                    CreateRouter({ }, { area: null }),
                    sequence(
                        CreateRouter(),
                        AddRoute({ UriPattern: "Home", Defaults: { id: null } })
                    )
                )),
                writeError('log'),
                logProps(),
                test("values cannot be null", function(d) {
                        debugger;
                    this.assert(function() {
                        return d.error instanceof Error && (
                                d.error.message == "Object `Defaults` must not have null properties: [\"id\"]"
                            ||  d.error.message == "Object `globals` must not have null properties: [\"area\"]"
                            );
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
                        AddRoute({ UriPattern: "Schedule/{name}-{id}/{xpto}", Defaults: { name: "", id: "", xpto: "" } }),
                        alternate(
                            GetRouteMatchFromUri("~/Schedule/Miguel-"),
                            GetRouteMatchFromUri("~/Schedule/-/"),
                            GetRouteMatchFromUri("~/Schedule/-12/any"),
                            GetRouteMatchFromUri("~/Schedule/Miguel-/any"),
                            GetRouteMatchFromUri("~/Schedule/-12"),
                            GetRouteMatchFromUri("~/Schedule/-/any")
                        )
                    ),
                    sequence(
                        AddRoute({ UriPattern: "File/{name}-{type}", Defaults: { name: "", type: "" } }),
                        alternate(
                            GetRouteMatchFromUri("~/File/fileName-"),
                            GetRouteMatchFromUri("~/File/-txt"),
                            GetRouteMatchFromUri("~/File/-")
                        )
                    )
                ),
                logProps(),
                writeError('log'),
                test("segment is partially filled", function(r) {
                    this.assert(function() {
                        return r.error && 0 <= r.details.indexOf("Match failed: segment is partially filled");
                    });
                })
            ),
            missingLiteral: sequence(
                CreateRouter(),
                alternate(
                    sequence(
                        AddRoute({ UriPattern: "Schedule/{name}-{id}/{xpto}", Defaults: { name: "", id: "", xpto: "" } }),
                        alternate(
                            GetRouteMatchFromUri("~/Schedule/Miguel"),
                            GetRouteMatchFromUri("~/Schedule//any"),
                            GetRouteMatchFromUri("~/Schedule/Miguel/any")
                        )
                    ),
                    sequence(
                        AddRoute({ UriPattern: "File/{name}-{type}", Defaults: { name: "", type: "" } }),
                        alternate(
                            GetRouteMatchFromUri("~/File/fileName")
                        )
                    )
                ),
                logProps(),
                writeError('log'),
                test("missing literal", function(r) {
                    this.assert(function() {
                        return r.error && 0 <= r.details.indexOf("Match failed: literal cannot be missing '-'");
                    });
                })
            ),
            discrepancies: sequence(
                CreateRouter(),
                alternate(
                    sequence(
                        AddRoute({ UriPattern: "{x}-{y}", Defaults: { } }),
                        GetRouteMatchFromUri("~/x-y-z"),
                        logProps(),
                        writeError('log'),
                        test("discrepancy #1", function(r) {
                            this.assert(function() {
                                return r.data.x == 'x' && r.data.y == 'y-z';
                            });
                        })
                    ),
                    sequence(
                        AddRoute({ UriPattern: "{x}-{y}", Defaults: { x: "" } }),
                        GetRouteMatchFromUri('~/---'),
                        logProps(),
                        writeError('log'),
                        test("discrepancy #2", function(r) {
                            this.assert(function() {
                                return r.error && 0 <= r.details.indexOf("Match failed: segment is partially filled");
                            });
                        })
                    )
                )
            ),
            matchFailThenMatchOk: sequence(
                CreateRouter(),
                alternate(
                    AddRoute({ UriPattern: "App/{controller}" }),
                    AddRoute({ UriPattern: "{controller}", Constraints: { controller: "^Schedule$" } })
                ),
                AddRoute({ UriPattern: "Home", Defaults: { controller: "Home" } }),
                GetRouteMatchFromUri("~/Home"),
                writeError('log'),
                logProps(),
                test("fail 1st route constraint and match next", function(r) {
                    this.assert(function() {
                        return r.data != null;
                    });
                })
            ),
            matchWithQuery: sequence(
                CreateRouter(),
                AddRoute({ UriPattern: "Home", Defaults: { controller: "Home" } }),
                alternate(
                    GetRouteMatchFromUri("~/Home?num=20"),
                    GetRouteMatchFromUri("~/Home?num=20&name=masb"),
                    GetRouteMatchFromUri("~/Home?num=20&name=masb&ok"),
                    GetRouteMatchFromUri("~/Home?nums=30&name=masb&ok&nums=40"),
                    GetRouteMatchFromUri("~/Home?fname=miguel+angelo"),
                    GetRouteMatchFromUri("~/Home?ok="),
                    GetRouteMatchFromUri("~/Home?fname=miguel%20angelo"),
                    GetRouteMatchFromUri("~/Home?amp=%26"),
                    GetRouteMatchFromUri("~/Home?nums=30?name=masb&ok?nums=40"),
                    GetRouteMatchFromUri("~/Home?nums=30;40?name=masb&ok"),
                    GetRouteMatchFromUri("~/Home?eq=a=b&name=masb")
                ),
                writeError('log'),
                logProps(),
                test("with query", function(r) {
                    this.assert(function() {
                        return r.data !== null
                            && (r.data.num||"20")==="20"
                            && (r.data.name||"masb")==="masb"
                            && (r.data.ok||"")===""
                            && (r.data.nums||"30;40")==="30;40"
                            && (r.data.fname||"miguel angelo")==="miguel angelo"
                            && (r.data.amp||"&")==="&"
                            && (r.data.eq||"a=b")==="a=b";
                    });
                })
            ),
            matchWithEmptyQuery: sequence(
                CreateRouter(),
                AddRoute({ UriPattern: "Home", Defaults: { controller: "Home" } }),
                alternate(
                    GetRouteMatchFromUri("~/Home?"),
                    GetRouteMatchFromUri("~/Home?&")
                ),
                writeError('log'),
                logProps(),
                test("with empty query", function(r) {
                    this.assert(function() {
                        return r.data != null;
                    });
                })
            ),
            buildUriStart1: sequence(
                CreateRouter(),
                AddRoute({ UriPattern: "App/{controller}/{action}/{id}", Defaults: { id: "", area: "App" } }),
                AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { controller: "Home", action: "Index", id: "" } }),
                alternate(
                    SetCurrentData({ area: "App", controller: "Schedule", action: "Index" }),
                    SetCurrentData({ controller: "Schedule", action: "Index" }),
                    SetCurrentData({ controller: "Home", action: "Index" })
                )
            ),
            // buildUriStart1
            buildUriWithArea: sequence(
                BuildURI({ area: "App", controller: "Schedule", action: "Details", id: "10" }),
                writeError('log'),
                test("build URI with area", function(uri) {
                    this.assert(function() {
                        return uri == "~/App/Schedule/Details/10";
                    });
                })
            ),
            // buildUriStart1
            buildUriWithQuery: sequence(
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
            // buildUriStart1
            buildUriForDefArea: sequence(
                BuildURI({ area: "", controller: "Home", action: "Details", id: "10" }),
                writeError('log'),
                test("build URI for default area", function(uri) {
                    this.log(uri);
                    this.assert(function() {
                        return uri == "~/Home/Details/10";
                    });
                })
            ),
            // buildUriStart1
            buildUriWithDefAtEnd: sequence(
                BuildURI({ area: "", controller: "Home", action: "Index" }),
                writeError('log'),
                test("build URI with default values at end", function(uri) {
                    this.log(uri);
                    this.assert(function() {
                        return uri == "~/";
                    });
                })
            ),
            // buildUriStart1
            buildUriKeepingArea: sequence(
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
            // buildUriStart1
            buildUriKeepingAreaCtrl: sequence(
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
            ),
            // buildUriStart1
            buildApplicationUri: sequence(
                null, // counter the catchCombinator bug... it shouldn't be a combinator
                catchError(alternate(
                    BuildApplicationURI({ action: "Details", id: "10" })
                )),
                writeError('log'),
                test("build URI for application", function(d) {
                    this.log(JSON.stringify(d));
                    var c = this.currentData;
                    if (c.controller == "Home")
                        this.assert(function() {
                            return d.value == "/MyApp/Home/Details/10";
                        });
                    else if (c.area == "App" && c.controller == "Schedule")
                        this.assert(function() {
                            return d.value == "/MyApp/App/Schedule/Details/10";
                        });
                    else if (c.controller == "Schedule")
                        this.assert(function() {
                            return d.value == "/MyApp/Schedule/Details/10";
                        });
                })
            ),
            buildUriWithConstraint: sequence(
                CreateRouter(),
                AddRoute({ UriPattern: "{controller}/{action}/{id}",
                    Defaults: { controller: "Home", action: "Index", id: "" },
                    Constraints: { controller: "^Home$", id: "^\\d*$" }}),
                SetCurrentData({ controller: "Home", action: "Index" }),
                catchError(alternate(
                    BuildURI({ mrk: "A", controller: "Home", action: "Details", id: "10" }),
                    BuildURI({ mrk: "B", controller: "Home", action: "Index" }),
                    BuildURI({ mrk: "C", action: "Details", id: "10" }),
                    BuildURI({ mrk: "D", action: "Index" }),
                    BuildURI({ mrk: "E", controller: "Invalid", action: "Index" }),
                    BuildURI({ mrk: "F", controller: "Home", action: "Details", id: "xpto" }),
                    undefined
                )),
                logProps(),
                test("build URI with constraint", function(d) {
                    var t = this.target;
                    if (t.mrk == "A")
                        this.assert(function() {
                            return d.value == "~/Home/Details/10?mrk=A";
                        });
                    if (t.mrk == "B")
                        this.assert(function() {
                            return d.value == "~/?mrk=B";
                        });
                    if (t.mrk == "C")
                        this.assert(function() {
                            return d.value == "~/Home/Details/10?mrk=C";
                        });
                    if (t.mrk == "D")
                        this.assert(function() {
                            return d.value == "~/?mrk=D";
                        });
                    if (t.mrk == "E")
                        this.assert(function() {
                            return d.error && d.error.message == "No matching route to build the URI";
                        });
                    if (t.mrk == "F")
                        this.assert(function() {
                            return d.error && d.error.message == "No matching route to build the URI";
                        });
                })
            ),
            buildUriWithoutData1: sequence(
                CreateRouter(),
                alternate(
                    AddRoute({ UriPattern: "{controller}/{action}" })
                ),
                catchError(
                    alternate(
                        BuildURI({ controller: "Home" }),
                        BuildURI({ })
                    )
                ),
                logProps(),
                test("build URI w/o data - error", function(d) {
                    this.assert(function() { return !!d.error; });
                })
            ),
            buildUriWithoutData2: sequence(
                CreateRouter(),
                AddRoute({ UriPattern: "{controller}/{action}" }),
                AddRoute({ UriPattern: "Home" }),
                catchError(
                    alternate(
                        BuildURI({ controller: "Home" }),
                        BuildURI({ })
                    )
                ),
                logProps(),
                test("build URI w/o data - no error", function(d) {
                    this.assert(function() { return !d.error; });
                })
            ),
            buildUriMatchingNone: sequence(
                CreateRouter(),
                alternate(
                    AddRoute({ UriPattern: "" }),
                    AddRoute({ UriPattern: "Home" }),
                    AddRoute({ UriPattern: "Home/Index" })
                ),
                catchError(BuildURI({ num: 20 })),
                logProps(),
                test("build URI matching 0 place-holders", function(d) {
                    var uri = this.lastRoute.UriPattern;
                    if (uri=="")
                        this.assert(function() { return d.value == "~/?num=20"; });
                    else if (uri=="Home")
                        this.assert(function() { return d.value == "~/Home?num=20"; });
                    else if (uri=="Home/Index")
                        this.assert(function() { return d.value == "~/Home/Index?num=20"; });
                })
            ),
            buildUriMatchFail: sequence(
                CreateRouter(),
                AddRoute({ UriPattern: "{controller}", Constraints: { controller: "^Schedule$" } }),
                AddRoute({ UriPattern: "Home", Defaults: { controller: "Home" } }),
                catchError(BuildURI({ controller: "Home" })),
                logProps(),
                test("build URI fail 1st, but match 2nd", function(d) {
                    this.assert(function() { return d.value == "~/Home"; });
                })
            ),
            buildUriWithLocationMixin: sequence(
                CreateRouterWithLocationMixin(),
                AddRoute({ UriPattern: "{controller}/{action}" }),
                alternate(
                    SetLocationMixinCurrentData({ controller: "Home", action: "Index" }),
                    SetLocationMixinCurrentData({ controller: "Home", action: "Details" })
                ),
                catchError(alternate(
                    LocationMixin_BuildURIVirt({ mrk: "A", controller: "Home", action: "Details" }),
                    LocationMixin_BuildURI({ mrk: "B", controller: "Home", action: "Details" }),
                    LocationMixin_BuildURIVirt({ mrk: "A", controller: "Home", action: "Index" }),
                    LocationMixin_BuildURI({ mrk: "B", controller: "Home", action: "Index" })
                )),
                logProps(),
                test("build URI using location mix-in", function(d) {
                    var t = this.target;
                    if (t.mrk == "A")
                        this.assert(function() { return d.value == "~/?mrk=A"; });
                    if (t.mrk == "B")
                        this.assert(function() { return d.value == "/MyApp/?mrk=B"; });
                })
            ),
            matchEmptyPattern: sequence(
                alternate(
                    sequence(
                        alternate(
                            CreateRouter(null, null, "MyApp"),
                            CreateRouter(null, null, "MyApp/"),
                            CreateRouter(null, null, "/MyApp"),
                            CreateRouter(null, null, "/MyApp/")
                        ),
                        AddRoute({ UriPattern: "" }),
                        alternate(
                            GetRouteMatchFromUri("/MyApp"),
                            GetRouteMatchFromUri("/MyApp/")
                        )
                    ),
                    sequence(
                        alternate(
                            CreateRouter(null, null, ""),
                            CreateRouter(null, null, "/")
                        ),
                        AddRoute({ UriPattern: "" }),
                        alternate(
                            GetRouteMatchFromUri(""),
                            GetRouteMatchFromUri("/")
                        )
                    )
                ),
                logProps(),
                test("match empty pattern", function(d) {
                    this.assert(function() { return JSON.stringify(d.data) == "{}"; });
                })
            )
            /*/
            singleTestTest: sequence(
                CreateRouter(),
                alternate(
                    AddRoute({ UriPattern: "" })
                ),
                GetRouteMatchFromUri(""),
                logProps(),
                test("test test", function(d) {
                    throw new Error("Test function called.");
                })
            )
            /**/
        };

        var groupedTestFunctions = [];
        
        /**/
        groupedTestFunctions.push(
            getTestFunctions(alternate(
                    tests.tryMatchUris,
                    undefined // no test at all
                )));

        groupedTestFunctions.push(
            getTestFunctions(alternate(
                    tests.routeValuesCannotBeNull,
                    tests.routeWithDefault,
                    tests.routeGetFromApplicationUri,
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
                    tests.matchFailThenMatchOk,
                    tests.matchWithQuery,
                    tests.matchEmptyPattern,
                    undefined // no test at all
                )));

        groupedTestFunctions.push(
            getTestFunctions(alternate(
                    sequence(
                        tests.buildUriStart1,
                        alternate(
                            tests.buildUriWithArea,
                            tests.buildUriWithQuery,
                            tests.buildUriForDefArea,
                            tests.buildUriWithDefAtEnd,
                            tests.buildUriKeepingArea,
                            tests.buildUriKeepingAreaCtrl,
                            tests.buildApplicationUri,
                            undefined // no test at all
                        ),
                        undefined // no test at all
                    ),
                    tests.buildUriWithConstraint,
                    tests.buildUriWithoutData1,
                    tests.buildUriWithoutData2,
                    tests.buildUriMatchingNone,
                    tests.buildUriMatchFail,
                    undefined // no test at all
                )));
        
        groupedTestFunctions.push(
            getTestFunctions(alternate(
                    tests.buildUriWithLocationMixin,
                    undefined // no test at all
                )));
                /*/
        groupedTestFunctions.push(
            getTestFunctions(alternate(
                    tests.singleTestTest,
                    undefined // no test at all
                )));
                /**/

        return groupedTestFunctions;
    }
    finally {
        markersEx.disableMarkers();
        testEx.dispose();
    }
}
