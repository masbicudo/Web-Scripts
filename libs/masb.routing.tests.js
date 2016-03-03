// Routing Tests v0.2.6    2016-02-20
//  author: Miguel Angelo
//  require: masb.routing.v0.2.6.js
//  require: masb.flow.graph.v1.7.2.js
//  require: masb.tests.v1.2.0.js
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
    
    function logProps(pretty) {
        return function logProps(o) {
            if (o === null) this.log("null");
            if (typeof o === 'undefined') this.log("undefined");
            for (var k in o)
                this.log(k + " = " + (typeof o[k] === 'undefined' ? o[k] : JSON.stringify(o[k], null, pretty)));
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

    function CreateRouter(routes, globals, basePath) {
        if (routes instanceof Array);
        else if (routes && typeof routes.uriPattern == 'string') routes = [routes];
        else routes = [];
        globals = globals || { area: "" };
        basePath = typeof basePath != 'string' ? "MyApp" : basePath;
        return function CreateRouter() {
            this.step("CreateRouter: basePath = " + JSON.stringify(basePath) + "; globals = " + JSON.stringify(globals) + "; routes = " + JSON.stringify(routes));
            return this.router = new Router({
                routes: routes,
                globals: globals,
                basePath: basePath
                });
        };
    }

    function CreateRouterWithLocationMixin(routes, globals, basePath) {
        if (routes instanceof Array);
        else if (routes && typeof routes.uriPattern == 'string') routes = [routes];
        else routes = [];
        globals = globals || { area: "" };
        basePath = typeof basePath != 'string' ? "MyApp" : basePath;
        return function CreateRouter() {
            this.step("CreateRouterWithLocationMixin: basePath = " + JSON.stringify(basePath) + "; globals = " + JSON.stringify(globals) + "; routes = " + JSON.stringify(routes));
            return this.router = new Router({
                routes: routes,
                globals: globals,
                basePath: basePath,
                // this mix-in tracks the current current location internally
                mixins: [routerMixins.location]
                });
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

    function BuildRouteURI(target) {
        return function BuildRouteURI() {
            this.step("BuildRouteURI: " + JSON.stringify(target));
            this.target = target;
            var result = this.router.enroute(this.currentData, target, {explain: true});
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

        /**/
        var tests = {
            routeWithDefault: sequence(
                alternate(
                    sequence(
                        CreateRouter(),
                        alternate(
                            AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { controller: "Home", action: "Index", id: "" } }),
                            AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { controller: "Home", id: "" } }),
                            AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { action: "Index", id: "" } }),
                            AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { id: "" } })
                        )
                    ),
                    CreateRouter({ uriPattern: "{controller}/{action}/{id}", defaults: { controller: "Home", action: "Index", id: "" } }),
                    CreateRouter({ uriPattern: "{controller}/{action}/{id}", defaults: { controller: "Home", id: "" } }),
                    CreateRouter({ uriPattern: "{controller}/{action}/{id}", defaults: { action: "Index", id: "" } }),
                    CreateRouter({ uriPattern: "{controller}/{action}/{id}", defaults: { id: "" } })
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
                    AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { controller: "Home", action: "Index", id: "" } }),
                    AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { controller: "Home", id: "" } }),
                    AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { action: "Index", id: "" } }),
                    AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { id: "" } })
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
                    AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { controller: "Home", action: "Index" } }),
                    AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { controller: "Home" } }),
                    AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { action: "Index" } }),
                    AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { } })
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
                            uriPattern: "{controller}/{action}/{id}",
                            defaults: { controller: "Home", action: "Index", id: "" } }),
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
                        uriPattern: "Schedule/{date}/{id}",
                        defaults: { controller: "Schedule", action: "Index", id: "" },
                        constraints: { date: "^\\d{4}-\\d\\d-\\d\\d$" } }),
                    AddRoute({
                        uriPattern: "Schedule/{date}/{id}",
                        defaults: { controller: "Schedule", action: "Index", id: "" },
                        constraints: { date: function(val,ctx) { return /^\d{4}-\d\d-\d\d$/g.test(val); } } })
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
                        AddRoute({ uriPattern: "Schedule/{{id}}" }),
                        GetRouteMatchFromUri("~/Schedule/{id}")
                    ),
                    sequence(
                        AddRoute({ uriPattern: "Schedule/{{id" }),
                        GetRouteMatchFromUri("~/Schedule/{id")
                    ),
                    sequence(
                        AddRoute({ uriPattern: "Schedule/id}}" }),
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
                    AddRoute({ uriPattern: "Schedule/{{id}" }),
                    AddRoute({ uriPattern: "Schedule/{id}}" })
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
                    CreateRouter({ uriPattern: "Home", defaults: { id: null } }),
                    CreateRouter({ }, { area: null }),
                    sequence(
                        CreateRouter(),
                        AddRoute({ uriPattern: "Home", defaults: { id: null } })
                    )
                )),
                writeError('log'),
                logProps(),
                test("values cannot be null", function(d) {
                    this.assert(function() {
                        return d.error instanceof Error && (
                                d.error.message == "Object `defaults` must not have null properties: [\"id\"]"
                            ||  d.error.message == "Object `globals` must not have null properties: [\"area\"]"
                            );
                    });
                })
            ),
            emptySegment: sequence(
                CreateRouter(),
                catchError(alternate(
                    AddRoute({ uriPattern: "Schedule//" }),
                    AddRoute({ uriPattern: "Schedule//{id}" })
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
                    AddRoute({ uriPattern: "Schedule/{}" }),
                    AddRoute({ uriPattern: "Schedule/{}/" })
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
                    AddRoute({ uriPattern: "Schedule/{year}{month}{day}" }),
                    AddRoute({ uriPattern: "Schedule/{year}{month}{day}/{id}" }),
                    AddRoute({ uriPattern: "{year}{month}{day}" })
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
                    AddRoute({ uriPattern: "Schedule/{id}/{id}" }),
                    AddRoute({ uriPattern: "Schedule/{id}-{id}" }),
                    AddRoute({ uriPattern: "Schedule/{name}-{id}/{name}/{id}" })
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
                        AddRoute({ uriPattern: "Schedule/{name}-{id}/{xpto}", defaults: { name: "", id: "", xpto: "" } }),
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
                        AddRoute({ uriPattern: "File/{name}-{type}", defaults: { name: "", type: "" } }),
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
                        AddRoute({ uriPattern: "Schedule/{name}-{id}/{xpto}", defaults: { name: "", id: "", xpto: "" } }),
                        alternate(
                            GetRouteMatchFromUri("~/Schedule/Miguel"),
                            GetRouteMatchFromUri("~/Schedule//any"),
                            GetRouteMatchFromUri("~/Schedule/Miguel/any")
                        )
                    ),
                    sequence(
                        AddRoute({ uriPattern: "File/{name}-{type}", defaults: { name: "", type: "" } }),
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
                        AddRoute({ uriPattern: "{x}-{y}", defaults: { } }),
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
                        AddRoute({ uriPattern: "{x}-{y}", defaults: { x: "" } }),
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
                    AddRoute({ uriPattern: "App/{controller}" }),
                    AddRoute({ uriPattern: "{controller}", constraints: { controller: "^Schedule$" } })
                ),
                AddRoute({ uriPattern: "Home", defaults: { controller: "Home" } }),
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
                AddRoute({ uriPattern: "Home", defaults: { controller: "Home" } }),
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
                AddRoute({ uriPattern: "Home", defaults: { controller: "Home" } }),
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
                AddRoute({ uriPattern: "App/{controller}/{action}/{id}", defaults: { id: "", area: "App" } }),
                AddRoute({ uriPattern: "{controller}/{action}/{id}", defaults: { controller: "Home", action: "Index", id: "" } }),
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
                AddRoute({ uriPattern: "{controller}/{action}/{id}",
                    defaults: { controller: "Home", action: "Index", id: "" },
                    constraints: { controller: "^Home$", id: "^\\d*$" }}),
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
            buildRouteUriWithConstraint: sequence(
                CreateRouter(),
                AddRoute({ uriPattern: "{controller}/{action}/{id}",
                    defaults: { controller: "Home", action: "Index", id: "" },
                    constraints: { controller: "^Home$", id: "^\\d*$" }}),
                SetCurrentData({ controller: "Home", action: "Index" }),
                catchError(alternate(
                    BuildRouteURI({ mrk: "A", controller: "Home", action: "Details", id: "10" }),
                    BuildRouteURI({ mrk: "B", controller: "Home", action: "Index" }),
                    BuildRouteURI({ mrk: "C", action: "Details", id: "10" }),
                    BuildRouteURI({ mrk: "D", action: "Index" }),
                    BuildRouteURI({ mrk: "E", controller: "Invalid", action: "Index" }),
                    BuildRouteURI({ mrk: "F", controller: "Home", action: "Details", id: "xpto" }),
                    undefined
                )),
                logProps(4),
                test("build route URI info with constraint", function(d) {
                    var t = this.target;
                    if (t.mrk == "A")
                        this.assert(function() {
                            return d.value.toString() == "/MyApp/Home/Details/10?mrk=A"
                                && d.value.virtualPath == "~/Home/Details/10?mrk=A"
                                && JSON.stringify(d.value.getPathValues()) == '{"controller":"Home","action":"Details","id":"10"}'
                                && JSON.stringify(d.value.getQueryValues()) == '{"mrk":"A"}';
                        });
                    if (t.mrk == "B")
                        this.assert(function() {
                            return d.value.toString() == "/MyApp/?mrk=B"
                                && d.value.virtualPath == "~/?mrk=B"
                                && JSON.stringify(d.value.getPathValues()) == '{"controller":"Home","action":"Index","id":""}'
                                && JSON.stringify(d.value.getQueryValues()) == '{"mrk":"B"}';
                        });
                    if (t.mrk == "C")
                        this.assert(function() {
                            return d.value.toString() == "/MyApp/Home/Details/10?mrk=C"
                                && d.value.virtualPath == "~/Home/Details/10?mrk=C"
                                && JSON.stringify(d.value.getPathValues()) == '{"controller":"Home","action":"Details","id":"10"}'
                                && JSON.stringify(d.value.getQueryValues()) == '{"mrk":"C"}';
                        });
                    if (t.mrk == "D")
                        this.assert(function() {
                            return d.value.toString() == "/MyApp/?mrk=D"
                                && d.value.virtualPath == "~/?mrk=D"
                                && JSON.stringify(d.value.getPathValues()) == '{"controller":"Home","action":"Index","id":""}'
                                && JSON.stringify(d.value.getQueryValues()) == '{"mrk":"D"}';
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
                    AddRoute({ uriPattern: "{controller}/{action}" })
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
                AddRoute({ uriPattern: "{controller}/{action}" }),
                AddRoute({ uriPattern: "Home" }),
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
                    AddRoute({ uriPattern: "" }),
                    AddRoute({ uriPattern: "Home" }),
                    AddRoute({ uriPattern: "Home/Index" })
                ),
                catchError(BuildURI({ num: 20 })),
                logProps(),
                test("build URI matching 0 place-holders", function(d) {
                    var uri = this.lastRoute.uriPattern;
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
                AddRoute({ uriPattern: "{controller}", constraints: { controller: "^Schedule$" } }),
                AddRoute({ uriPattern: "Home", defaults: { controller: "Home" } }),
                catchError(BuildURI({ controller: "Home" })),
                logProps(),
                test("build URI fail 1st, but match 2nd", function(d) {
                    this.assert(function() { return d.value == "~/Home"; });
                })
            ),
            buildUriWithLocationMixin: sequence(
                CreateRouterWithLocationMixin(),
                AddRoute({ uriPattern: "{controller}/{action}" }),
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
                        AddRoute({ uriPattern: "" }),
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
                        AddRoute({ uriPattern: "" }),
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
        };
        /*/
        var tests = {
            singleTestTest: sequence(
                CreateRouter(),
                catchError(alternate(
                    //AddRoute({ uriPattern: "Schedule/{id}/{id}" }),
                    //AddRoute({ uriPattern: "Schedule/{id}-{id}" }),
                    AddRoute({ uriPattern: "Schedule/{name}-{id}/{name}/{id}" })
                )),
                writeError('log'),
                test("duplicate place-holders", function(d) {
                    this.assert(function() {
                        return d.error instanceof Error && d.error.type == "DUPLICATE_PLACEHOLDER";
                    });
                })
            )
        };
        /**/




        var groupedTestFunctions = [];
        
        /**/
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
                    tests.buildRouteUriWithConstraint,
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
