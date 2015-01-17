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
    function Literal(value) {
         this.value = value.replace(/\{\{/g, "{").replace(/\}\}/g, "}");
    }

    function Name(name) {
         this.name = name;
    }

    function getSegments(uriPattern) {
        var segments = uriPattern && uriPattern.split('/').map(function (seg) {
            var ss = seg.split(/(?:([^\{\}]+)|\{([^\{\}]*)(?!\}\})\})/g),
                items = [];

            for (var itSs = 0; itSs < ss.length; itSs += 3) {
                var empty = ss[itSs],
                    literal = ss[itSs + 1],
                    name = ss[itSs + 2];

                if (empty) throw new Error("Invalid route pattern: near '" + empty + "'");

                if (itSs == ss.length - 1) break;

                if (literal) items.push(new Literal(literal));
                else if (name) items.push(new Name(name));
                else throw new Error("Invalid route pattern: empty segment");
            }
            return items;
        });

        // validating:
        // - Names of placeholders cannot be repeated
        // - Adjacent placeholders
        var usedNames = {},
            prevName = '';
        for (var itSeg = 0; itSeg < segments.length; itSeg++) {
            var subSegs = segments[itSeg];
            for (var itSub = 0; itSub < subSegs.length; itSub++) {
                var item = subSegs[itSub];
                if (item instanceof Name) {
                    if (prevName !== '') throw new Error("Invalid route pattern: '{" + prevName + "}' and '{" + item.name + "}' cannot be adjacent");
                    if (usedNames[item.name]) throw new Error("Invalid route pattern: '{" + item.name + "}' used multiple times");
                    if (!item.name) throw new Error("Invalid route pattern: found '{}'");
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
                            return new Error("Match failed: constraint of '{" + name + "}' did not match");
                    }

                    // no value and no default
                    if (!value && typeof def == 'undefined')
                        return new Error("Match failed: no value and no default for '{" + name + "}'");

                    if (!value) missing++;
                    else filled++;
                }

                // segment is partialy filled
                if (filled && missing)
                    return new Error("Match failed: segment is partialy filled");

                // missing segments may only appear at end
                if (filled && optSegs)
                    return new Error("Match failed: missing segments may only appear at end");

                if (missing) optSegs++;
            }
        }
        return "OK";
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

    function Router(routes) {
        this.routes = routes || [];
    }
    Router.prototype = {
        getRouteFromURI: function (uri) {
            for (var itR = 0; itR < this.routes.length; itR++) {
                var route = this.routes[itR];

                // Trying to match the route information with the given URI.
                // Convert the URI pattern to a RegExp that can extract information from a real URI.
                var segments = getSegments(route.UriPattern);
                var segValues = matchSegments(segments, uri);
                var validation = validateSegmentValues(segments, route, segValues);

                if (validation instanceof Error)
                    return validation;

                var values = getRouteValues(route, segments, segValues);
                var r = {};

                // copy route data to the resulting object
                for (var kt in route.DataTokens)
                    r[kt] = route.DataTokens[kt];

                for (var kd in route.Defaults)
                    r[kd] = route.Defaults[kd];

                for (var kv in values)
                    r[kv] = values[kv];

                return r;
            }

            return new Error("No routes matched the URI.");
        }
    };

    return this.Router = Router;
})();