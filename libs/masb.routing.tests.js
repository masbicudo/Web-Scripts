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
    
    function logProps() {
        return function(o) {
            if (o === null) this.log("null");
            if (typeof o === 'undefined') this.log("undefined");
            for (var k in o)
                this.log(k + " = " + (typeof o[k] === 'undefined' ? o[k] : JSON.stringify(o[k])));
            return o;
        }
    }
    

    function CreateRouter(o) {
        if (typeof o == 'undefined')
            return function() {
                this.step("CreateRouter");
                return this.router = new Router();
            };
        else
            return function() {
                this.step("CreateRouter: " + JSON.stringify(o));
                return this.router = new Router(o);
            };
    }

    function AddRoute(o) {
        return function() {
            this.step("AddRoute: " + JSON.stringify(o));
            return this.router.routes.push(o);
        };
    }

    function GetRouteDataFromUri(uri) {
        return function() {
            this.step("GetRouteDataFromUri: " + uri);
            return this.routeData = this.router.getRouteFromURI(uri);
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
                        AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { id: null } }),
                        AddRoute({ UriPattern: "{controller}/{action}/{id}", Defaults: { } })
                    ),
                    alternate(
                        GetRouteDataFromUri("~/Home/Index/"),
                        GetRouteDataFromUri("~/Home/Index")
                    ),
                    logProps(),
                    test("Test #1: c=Home, a=Index, i=null", function(data) {
                        if (data instanceof Error)
                            this.warn(data.message);
                        this.assert(function() {
                            return data.controller == "Home" && data.action == "Index" && typeof data.id == 'undefined';
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
