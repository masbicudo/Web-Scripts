// Masb Routing    v0.1.0
//
//  This is responsible for routing, that is,
//  extracting information from an URI so that
//  an external agent can determine what to
//  render next.
//
//  This will mimic the behaviour of ASP.NET routing with the following exceptions:
//  1) when building patterns:
//      - none yet
//  2) when matching URI's:
//      - pattern "{x}-{y}" matches '~/x-y-z/' as:
//          Here:    x -> 'x';   y -> 'y-z'
//          ASP.NET: x -> 'x-y'; y -> 'z'
//      - pattern "{x?}-{y}" matches '~/---/' as:
//          Here:    x -> no match (x = '' and y = '--', but x is a middle place-holder)
//          ASP.NET: x -> '-'; y -> '-'
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
    function remLine(str, num) {
        var lines = str.split('\n');
        lines.splice(num-1, 1);
        return lines.join('\n');
    }
    function RouteError(type, message) {
        if (window.chrome) {
            var err = new Error();
            this.__defineGetter__('stack', function(){return remLine(err.stack, 1);});
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
         this.regexp = escapeRegExp(this.value);
        Object.freeze(this);
    }
    Literal.prototype = {
        toString: function() {
            return "Literal: " + JSON.stringify(this.value);
        }
    };

    function PlaceHolderBase(name) {
        this.name = name;
        Object.freeze(this);
    }
    PlaceHolderBase.prototype = {
        toString: function() {
            return "Name: " + this.name;
        }
    };

    function getSegments(uriPattern, LiteralClass, PlaceHolderClass) {
        var segments = uriPattern && uriPattern.split('/').map(function (seg) {
            var ss = seg.split(/(?:((?:[^\{\}]|\{\{|\}\})+)|\{([^\{\}]*)(?!\}\})\})/g),
                items = [];

            for (var itSs = 0; itSs < ss.length; itSs += 3) {
                var empty = ss[itSs],
                    literal = ss[itSs + 1],
                    name = ss[itSs + 2];

                if (empty) throw new RouteError(types.SYNTAX_ERROR, "Invalid route pattern: near '" + empty + "'");

                if (itSs == ss.length - 1) break;

                if (typeof literal == 'string') items.push(new LiteralClass(literal));
                else if (typeof name == 'string') items.push(new PlaceHolderClass(name));
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
                if (item instanceof PlaceHolderBase) {
                    if (prevName !== '') throw new RouteError(types.ADJACENT_PLACEHOLDERS, "Invalid route pattern: '{" + prevName + "}' and '{" + item.name + "}' cannot be adjacent");
                    if (usedNames[item.name]) throw new RouteError(types.DUPLICATE_PLACEHOLDER, "Invalid route pattern: '{" + item.name + "}' used multiple times");
                    if (!item.name) throw new RouteError(types.UNNAMED_PLACEHOLDER, "Invalid route pattern: found '{}'");
                    usedNames[item.name] = true;
                }
                prevName = item instanceof PlaceHolderBase ? item.name : '';
            }
            prevName = '';
        }

        return segments;
    }

    function escapeRegExp(str) {
        // http://stackoverflow.com/a/6969486/195417
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    function validateSegmentValues(segments, route, segValues) {
        var segIdx = 0,
            glbFilled = 0,
            glbMissing = 0;

        for (var itSeg = 0; itSeg < segments.length; itSeg++) {

            var subSegs = segments[itSeg],
                missing = 0,
                filled = 0,
                literals = 0;

            for (var itSub = 0; itSub < subSegs.length; itSub++) {
                var item = subSegs[itSub],
                    value = segValues[segIdx++];
                    
                if (item instanceof PlaceHolderBase) {
                    var name = item.name,
                        constraint = route.Constraints && route.Constraints[name],
                        def = route.Defaults && route.Defaults[name];

                    // constraint fail
                    if (typeof constraint == 'string') {
                        var regex = new RegExp(constraint, 'g');
                        if (!regex.test(value))
                            return "Match failed: constraint of '{" + name + "}' did not match";
                    }
                    else if (typeof constraint == 'function') {
                        if (!constraint(value))
                            return "Match failed: constraint of '{" + name + "}' did not match";
                    }

                    // no value and no default
                    if (!value && typeof def == 'undefined')
                        return "Match failed: no value and no default for '{" + name + "}'";
                }
                else if (item instanceof Literal) {
                    // ASP.NET: literal can never be missing
                    if (value !== item.value)
                        return "Match failed: literal cannot be missing '" + item.value + "'";
                    literals++;
                }

                if (!value) missing++;
                else filled++;
            }

            // ASP.NET: segment is partially filled
            if (literals && missing)
                return "Match failed: segment is partially filled";

            // ASP.NET: missing segments may only appear at end
            if (!filled) glbMissing++;
            else if (glbMissing) {
                return "Match failed: missing segments may only appear at end";
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
                if (item instanceof PlaceHolderBase)
                    r[item.name] = segValues[segIdx];
                segIdx++;
            }
        }
        return r;
    }

    function getSegmentsMatcher(segments) {
        var rgxStr = "^";
        for (var itSeg = 0; itSeg < segments.length; itSeg++) {
            var subSegs = segments[itSeg], cntUnclosed = 0;
            rgxStr += "(?:" + (itSeg ? "\\/" : "\\~\\/");
            for (var itSub = 0; itSub < subSegs.length; itSub++) {
                var item = subSegs[itSub];
                if (item instanceof PlaceHolderBase) {
                    var adjLit = subSegs[itSub + 1],
                        adjLitRgx = adjLit instanceof Literal ? "|" + adjLit.regexp : "",
                        op = item.isOptional ? '*' : '+';

                    rgxStr += "((?:(?!\\/" + adjLitRgx + ").)" + op + ")?";
                } else if (item instanceof Literal) {
                    rgxStr += "(?:" + "(" + item.regexp + ")";
                    cntUnclosed++;
                }
            }
            for (var itU = 0; itU < cntUnclosed; itU++)
                rgxStr += ")?";
        }
        for (var itP = 0; itP < segments.length; itP++)
            rgxStr += ")?";
        rgxStr += "$";

        var regex = new RegExp(rgxStr, 'g');

        SegmentsMatcher.regex = regex;
        function SegmentsMatcher(uri) {
                regex.lastIndex = 0;
                var result = regex.exec(uri);
                if (!result) return null;
                result.shift();
                return result.map(function(s){return s||undefined;});
            };
        return SegmentsMatcher;
    }
    
    function Route(route) {
        if (!route || typeof route != 'object')
            throw new Error("Invalid route information: route argument cannot be missing");

        var constraints = route.Constraints ? extend({}, route.Constraints) : {};

        function PlaceHolder(name) {
            this.name = name;
            this.isOptional = !!route.Defaults && route.Defaults.hasOwnProperty(name) && typeof route.Defaults[name] !== 'undefined';
            if (this.isOptional)
                this.defaultValue = route.Defaults[name];
            this.isConstrained = constraints.hasOwnProperty(name);
            if (this.isConstrained) {
                this.constraint = constraints[name];
                delete constraints[name];
            }
            Object.freeze(this);
        }
        PlaceHolder.prototype = Object.create(PlaceHolderBase.prototype);

        var segments = getSegments(route.UriPattern, Literal, PlaceHolder);
        var segmentsMatcher = getSegmentsMatcher(segments);

        // properties with extracted information from the route object
        this.segments = segments;
        this.match = segmentsMatcher;
        this.contextChecks = constraints;

        // source object properties
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

    function addParams(p2, values) {
        for (var p1 in values) {
            if (!this[p1]) this[p1] = {};
            this[p1][p2] = values[p1];
        }
    }

    function clearParams(p2) {
        for (var p1 in this)
            delete this[p1][p2];
    }

    function Router(routes) {
        var _routes = [];

        if (routes instanceof Array)
            for (var itR = 0; itR < routes.length; itR++)
                addRoute(routes[itR]);

        this.addRoute = addRoute;
        this.getRoute = getRoute;
        this.getRouteDataFromURI = getRouteDataFromURI;
        this.getURIFromRouteData = getURIFromRouteData;

        function getURIFromRouteData(currentRouteData, targetRouteData) {
            for (var itR = 0; itR < _routes.length; itR++) {
                var route = _routes[itR];

                var params = {};
                var add = addParams.bind(params);
                var clr = clearParams.bind(params);
                add('current', currentRouteData);
                add('target', targetRouteData);
                add('default', route.Defaults);
                add('constraint', route.Constraints);

                // Getting values that will be used.
                var result = {}, allowCurrent = true;
                for (var itS = 0; itS < route.segments; itS++) {
                    var seg = route.segments[itS];
                    for (var itSS = 0; itSS < seg.length; itSS++) {
                        var item = seg[itSS];
                        if (item instanceof PlaceHolderBase) {
                            var name = item.name;
                            var param = params[name];
                            var c = param.current;
                            var t = param.target;
                            var d = param.default;

                            param.used = true;

                            // c t d r
                            // - - - x
                            // a - - a
                            // - a - a
                            // - - a a
                            // a a - a
                            // a b - b+{clr c}
                            // a - a a
                            // a - b a
                            // - a a a
                            // - a b a
                            // a a a a
                            // a a b a
                            // a b a b
                            // b a a a
                            // a b c b

                            var nc = !c, nt = !t, nd = typeof d == 'undefined', ect = c == t, etd = t == d, edc = d == c;
                            var r;
                            if (nc && nt && nd) break;
                            if (c && nt && nd) r = c;
                            if (nc && t && nd) r = t;
                            if (nc && nt && d) r = d;
                            if (c && ect && nd) r = t;
                            if (c && t && nd) { r = t; clr('current'); }
                            if (edc && nt && d) r = c;
                            if (c && nt && d) r = c;
                            if (nc && t && etd) r = t;
                            if (nc && t && d) r = t;
                            if (edc && ect && d) r = t;
                            if (c && ect && d) r = t;
                            if (edc && t && d) r = t;
                            if (c && t && etd) r = t;
                            if (c && t && d) r = t;

                            result[name] = r;
                        }
                    }
                }
                
                // 
            }
        }
        
        function getRouteDataFromURI(uri) {
            // ASP.NET routing code (for reference): http://referencesource.microsoft.com/#System.Web/Routing/ParsedRoute.cs
            for (var itR = 0; itR < _routes.length; itR++) {
                var route = _routes[itR];

                // Trying to match the route information with the given URI.
                // Convert the URI pattern to a RegExp that can extract information from a real URI.
                var segments = route.segments;
                var segValues = route.match(uri);
                if (!segValues)
                    return new RouteMatch(null, "Match failed: URI does not match");
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