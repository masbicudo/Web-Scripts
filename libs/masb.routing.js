// Masb Routing    v0.1.0
//
//  This is responsible for routing, that is,
//  extracting information from an URI so that
//  an external agent can determine what to
//  render next.
//
//  This will mimic the behaviour of ASP.NET
//  routing as seamlessly as possible.
//
//  This will not:
//  - change URI for single-page apps
//  - request server data in any way

(function() {
    function extend(target, source) {
        for (var k in source)
            if (source.hasOwnProperty(k))
                target[k] = source[k];
        return target;
    }
    function RouteError(type, message) {
        if (window.chrome) {
            var err = new Error();
            this.__defineGetter__('stack', function(){return err.stack;});
            this.__defineSetter__('stack', function(value){err.stack=value;});
        }
        this.message = message;
        this.type = type;
    }
    this.RouteError = RouteError;
    var types;
    RouteError.prototype = extend(Object.create(Error.prototype), {
        message: 'Route error.',
        name: 'RouteError',
        constructor: RouteError,
        types: types = {
                SYNTAX_ERROR: 'SYNTAX_ERROR',
                EMPTY_SEGMENT: 'EMPTY_SEGMENT',
                ADJACENT_PLACEHOLDERS: 'ADJACENT_PLACEHOLDERS',
                DUPLICATE_PLACEHOLDER: 'DUPLICATE_PLACEHOLDER',
                UNNAMED_PLACEHOLDER: 'UNNAMED_PLACEHOLDER'
            }
    });

    function Literal(value) {
         this.value = value.replace(/\{\{/g, "{").replace(/\}\}/g, "}");
    }

    function Name(name) {
         this.name = name;
    }

    function getSegments(uriPattern) {
        var segments = uriPattern && uriPattern.split('/').map(function (seg) {
            var ss = seg.split(/(?:((?:[^\{\}]|\{\{|\}\})+)|\{([^\{\}]*)(?!\}\})\})/g),
                items = [];

            for (var itSs = 0; itSs < ss.length; itSs += 3) {
                var empty = ss[itSs],
                    literal = ss[itSs + 1],
                    name = ss[itSs + 2];

                if (empty) throw new RouteError(types.SYNTAX_ERROR, "Invalid route pattern: near '" + empty + "'");

                if (itSs == ss.length - 1) break;

                if (typeof literal == 'string') items.push(new Literal(literal.replace('{{','{').replace('}}','}')));
                else if (typeof name == 'string') items.push(new Name(name));
            }
            return items;
        });

        // validating:
        // - Names of place-holders cannot be repeated
        // - Adjacent place-holders
        var usedNames = {},
            prevName = '';
        for (var itSeg = 0; itSeg < segments.length; itSeg++) {
            var subSegs = segments[itSeg];
            if (itSeg < segments.length - 1 && subSegs.length == 0)
                throw new RouteError(types.EMPTY_SEGMENT, "Invalid route pattern: empty segment #" + itSeg);
            for (var itSub = 0; itSub < subSegs.length; itSub++) {
                var item = subSegs[itSub];
                if (item instanceof Name) {
                    if (prevName !== '') throw new RouteError(types.ADJACENT_PLACEHOLDERS, "Invalid route pattern: '{" + prevName + "}' and '{" + item.name + "}' cannot be adjacent");
                    if (usedNames[item.name]) throw new RouteError(types.DUPLICATE_PLACEHOLDER, "Invalid route pattern: '{" + item.name + "}' used multiple times");
                    if (!item.name) throw new RouteError(types.UNNAMED_PLACEHOLDER, "Invalid route pattern: found '{}'");
                    usedNames[item.name] = true;
                }
                prevName = item instanceof Name ? item.name : '';
            }
            prevName = '';
        }

        return segments;
    }

    function escapeRegExp(str) {
        // http://stackoverflow.com/a/6969486/195417
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    function matchSegments(segments, uri) {
        var rgxStr = "^";
        for (var itSeg = 0; itSeg < segments.length; itSeg++) {
            var subSegs = segments[itSeg];
            rgxStr += itSeg ? "(?:\/" : "(?:\~\/";
            for (var itSub = 0; itSub < subSegs.length; itSub++) {
                var item = subSegs[itSub];
                if (item instanceof Name) {
                    var adjLit = subSegs[itSub + 1],
                        adjLitRgx = adjLit instanceof Literal ? "|" + escapeRegExp(adjLit.value) : "";

                    rgxStr += "((?:(?!\/" + adjLitRgx + ").)*)";
                } else if (item instanceof Literal) {
                    rgxStr += escapeRegExp(item.value);
                }
            }
        }

        for (var itP = 0; itP < segments.length; itP++)
            rgxStr += ")?";

        rgxStr += "$";

        var regex = new RegExp(rgxStr, 'g');

        var result = regex.exec(uri).map(function(s){return s||undefined;});
        result.shift();
        return result;
    }

    function validateSegmentValues(segments, route, segValues) {
        var segIdx = 0,
            optSegs = 0;

        for (var itSeg = 0; itSeg < segments.length; itSeg++) {

            var subSegs = segments[itSeg],
                missing = 0,
                filled = 0;

            for (var itSub = 0; itSub < subSegs.length; itSub++) {
                var item = subSegs[itSub];
                if (item instanceof Name) {
                    var name = item.name,
                        rgxStr = route.Constraints && route.Constraints[name],
                        def = route.Defaults && route.Defaults[name],
                        value = segValues[segIdx++];

                    // has constraint
                    if (rgxStr) {
                        var regex = new RegExp(rgxStr, 'g');
                        if (!regex.test(value))
                            return "Match failed: constraint of '{" + name + "}' did not match";
                    }

                    // no value and no default
                    if (!value && typeof def == 'undefined')
                        return "Match failed: no value and no default for '{" + name + "}'";

                    if (!value) missing++;
                    else filled++;
                }

                // segment is partially filled
                if (filled && missing)
                    return "Match failed: segment is partially filled";

                // missing segments may only appear at end
                if (filled && optSegs)
                    return "Match failed: missing segments may only appear at end";

                if (missing) optSegs++;
            }
        }
        return null;
    }

    function getRouteValues(route, segments, segValues) {
        var segIdx = 0,
            r = {};
        for (var itSeg = 0; itSeg < segments.length; itSeg++) {
            var subSegs = segments[itSeg];
            for (var itSub = 0; itSub < subSegs.length; itSub++) {
                var item = subSegs[itSub];
                if (item instanceof Name)
                    r[item.name] = segValues[segIdx++];
            }
        }
        return r;
    }

    function Route(route) {
        this.segments = getSegments(route.UriPattern);
        this.UriPattern = route.UriPattern;
        this.DataTokens = route.DataTokens;
        this.Defaults = route.Defaults;
        this.Constraints = route.Constraints;
        Object.freeze(this);
    }

    function RouteMatch(data, error) {
        if (!(this instanceof RouteMatch)) throw new Error("Call with 'new' operator.");
        this.data = data;
        this.error = error;
        Object.freeze(this);
    }
    this.RouteMatch = RouteMatch;

    function Router(routes) {
        var _routes = [];

        if (routes instanceof Array)
            for (var itR = 0; itR < routes.length; itR++)
                addRoute(routes[itR]);

        this.addRoute = addRoute;
        this.getRoute = getRoute;
        this.getRouteDataFromURI = getRouteDataFromURI;

        function getRouteDataFromURI(uri) {
            for (var itR = 0; itR < _routes.length; itR++) {
                var route = _routes[itR];

                // Trying to match the route information with the given URI.
                // Convert the URI pattern to a RegExp that can extract information from a real URI.
                var segments = route.segments;
                var segValues = matchSegments(segments, uri);
                var validation = validateSegmentValues(segments, route, segValues);

                if (validation)
                    return new RouteMatch(null, validation);

                var values = getRouteValues(route, segments, segValues);
                var r = {};

                // copy route data to the resulting object
                for (var kt in route.DataTokens)
                    r[kt] = route.DataTokens[kt];

                for (var kd in route.Defaults)
                    r[kd] = route.Defaults[kd];

                for (var kv in values)
                    r[kv] = values[kv];

                return new RouteMatch(r, null);
            }

            return new RouteMatch(null, "No routes matched the URI.");
        };

        function addRoute(name, route) {
            if (typeof name !== 'string' && name != null || name === "" || /^\d+$/.test(name))
                throw new Error("Argument name is invalid");
            _routes.push(new Route(route));
            if (name)
                _routes[name] = route;
        };

        function getRoute(idOrName) {
            return _routes[idOrName];
        };

        Object.freeze(this);
    }

    return this.Router = Router;
})();