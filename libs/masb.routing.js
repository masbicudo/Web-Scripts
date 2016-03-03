/// MASB-Router v0.2.6      2016-02-20
///
///  Name: MASB-Router
///  Version: 0.2.6
///  Author: Miguel Angelo <masbicudo@gmail.com>
///  License: MIT
///
///  This is responsible for routing, that is,
///  extracting information from an URI so that
///  an external agent can determine what to
///  render next.
///
///  It can also construct an URI given an object
///  containing values. The first route that matches
///  the values will be used to construct the URI.
///
///  This will mimic the behaviour of ASP.NET routing with the following exceptions:
///  E.1) when building patterns:
///         - optional parameters defined in the defaults collection of a route
///             Here:    paramName: ""
///             ASP.NET: paramName = UrlParameter.Optional
///  E.2) when matching URI:
///         - pattern "{x}-{y}" matches '~/x-y-z/' as:
///             Here:    x -> 'x';   y -> 'y-z'
///             ASP.NET: x -> 'x-y'; y -> 'z'
///         - pattern "{x?}-{y}" matches '~/---/' as:
///             Here:    x -> no match (x = '' and y = '--', but x is a middle place-holder)
///             ASP.NET: x -> '-'; y -> '-'
///
///  Some controversial behaviours of ASP.NET router that were kept:
///  K.1) when parsing URI
///         - query string "?n" is the same as "?n=", both have `n` evalueated as an empty string ""
///             The first could be evaluated to null, and the second to ""... but ASP.NET does not do that.
///
///  This will not:
///  - change URI for single-page apps
///  - request server data in any way
///
/// This router support mix-in functions, that can be used to add plug-ins into it.
/// With plug-ins, anything is possible, including the above mentioned behaviours.
"use strict";

(function (root, factory) {
    function setGlobal(exports) {
        for(var k in exports)
            if (exports.hasOwnProperty(k))
                root[k] = exports[k];
    }
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([/* 'b' */], function (/* b */) {
            return (/*setGlobal(*/
                factory(/* b */)
            /*)*/);
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        /*setGlobal(*/
            module.exports = factory(/* require('b') */)
        /*)*/;
    } else {
        // Browser globals (root is window)
        setGlobal(factory(/* root.b */));
    }
}(this, function (/* b */) {
    //use b in some fashion.




    var undefined; // left undefined undefined

/*****************************************************************************************
**                                                                                      **
**    PROTOTYPES.                                                                       **
**                                                                                      **
*****************************************************************************************/

    function RouteError(type, message) {
        if (window.chrome) {
            var err = new Error();
            this.__defineGetter__('stack', function(){return remLine(err.stack, 1);});
            this.__defineSetter__('stack', function(value){err.stack=value;});
        }
        this.message = message;
        this.type = type;
    }
    var freeze = Object.freeze;
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
        freeze(this);
    }
    Literal.prototype = {
        toString: function() {
            return "Literal: " + JSON.stringify(this.value);
        }
    };

    function PlaceHolderBase(name) {
        this.name = name;
        freeze(this);
    }
    PlaceHolderBase.prototype = {
        toString: function() {
            return "Name: " + this.name;
        }
    };




/*****************************************************************************************
**                                                                                      **
**    PRIVATE METHODS.                                                                  **
**                                                                                      **
*****************************************************************************************/

    function extend(target, source) {
        for (var k in source)
            if (source.hasOwnProperty(k))
                target[k] = source[k];
        return target;
    }

    function extendDefined(target, source) {
        if (source)
            for (var k in source)
                if (source.hasOwnProperty(k))
                    if (typeof source[k] != 'undefined')
                        target[k] = source[k];
        return target;
    }

    function throwOnNullValue(name, o) {
        var nulls = [];
        for(var k in o)
            if (o.hasOwnProperty(k))
                if (o[k] === null)
                    nulls.push(k);
        if (nulls.length)
            throw new Error("Object `"+name+"` must not have null properties: "+JSON.stringify(nulls));
    }

    function remLine(str, num) {
        var lines = str.split('\n');
        lines.splice(num-1, 1);
        return lines.join('\n');
    }

    function getSegments(uriPattern, LiteralClass, PlaceHolderClass) {
        if (typeof uriPattern != 'string') throw new Error("uriPattern must be a string.");
        if (uriPattern == "") return [[new LiteralClass("")]];
        var segments = uriPattern.split('/').map(function (seg) {
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

    function matchConstraint(constraint, value) {
        // constraint fail
        value = value==null ? "" : ""+value;
        if (typeof constraint == 'string') {
            var regex = new RegExp(constraint, 'g');
            if (!regex.test(value))
                return false;
        }
        else if (typeof constraint == 'function') {
            if (!constraint(value))
                return false;
        }
        return true;
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
                    value = segValues[segIdx++] || "";
                    
                if (item instanceof PlaceHolderBase) {
                    var name = item.name,
                        constraint = route.constraints && route.constraints[name],
                        def = route.defaults && route.defaults[name];

                    if (!matchConstraint(constraint, value))
                        return "Match failed: constraint of '{" + name + "}' did not match";

                    // no value and no default
                    if (!value && isUndefined(def))
                        return "Match failed: no value and no default for '{" + name + "}'";
                }
                else if (item instanceof Literal) {
                    // ASP.NET: literal can never be missing
                    if (value !== item.value)
                        return "Match failed: literal cannot be missing '" + item.value + "'";
                    literals++;
                }

                if (!value && item.value != "") missing++;
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

        var constraints = route.constraints ? extend({}, route.constraints) : {};
        throwOnNullValue("defaults", route.defaults);

        // 
        // Subclass PlaceHolder
        // 
        function PlaceHolder(name) {
            this.name = name;
            this.isOptional = !!route.defaults
                && route.defaults.hasOwnProperty(name)
                && !isUndefined(route.defaults[name]);
            if (this.isOptional)
                this.defaultValue = route.defaults[name];
            this.isConstrained = constraints.hasOwnProperty(name);
            if (this.isConstrained) {
                this.constraint = constraints[name];
                delete constraints[name];
            }
            freeze(this);
        }
        PlaceHolder.prototype = Object.create(PlaceHolderBase.prototype);


        var segments = getSegments.call(this, route.uriPattern, Literal, PlaceHolder);
        var segmentsMatcher = getSegmentsMatcher.call(this, segments);

        // properties with extracted information from the route object
        this.segments = segments;
        this.match = segmentsMatcher;
        this.contextChecks = constraints;

        // source object properties
        this.uriPattern = route.uriPattern;
        this.dataTokens = route.dataTokens;
        this.defaults = route.defaults;
        this.constraints = route.constraints;

        freeze(this);
    }

    function freezeAny(o) {
        if (typeof o == 'object' && o != null)
            return freeze(o);
        return o;
    }

    function RouteMatch(data, tokens, error, details) {
        if (!(this instanceof RouteMatch))
            throw new Error("Call with 'new' operator.");
        this.data = freezeAny(data);
        this.tokens = freezeAny(tokens);
        this.error = freezeAny(error);
        this.details = freezeAny(details);
        freeze(this);
    }

    function addParams(p2, values) {
        for (var p1 in values) {
            if (!this[p1]) this[p1] = {};
            this[p1][p2] = values[p1];
        }
    }

    function ifUndef(f,t) {
        return isUndefined(f) ? t : f;
    }
    
    function isNullOrEmpty(x) {
        return x===null||x==="";
    }

    function isUndefined(x) {
        return typeof x == 'undefined';
    }

    function ensureStringLimits(start, end, str) {
        str = ""+str;
        end = ""+end;

        str = str == "" ? start
            : str[0] != start ? (start+str)
            : str;

        str = str == "" ? end
            : str[str.length-1] != end ? (str+end)
            : str;

        return str;
    }

    function bindUriValues(route, currentRouteData, targetRouteData, globalValues) {
        var params = {};
        var add = addParams.bind(params);
        add('current', currentRouteData);
        add('target', targetRouteData);
        add('default', route.defaults);
        add('constraint', route.constraints);
        add('global', globalValues);

        // Getting values that will be used.
        var result = { uriValues: {}, dataTokens: {} }, allowCurrent = true;
        var fnc = false;
        for (var itS = 0; itS < route.segments.length; itS++) {
            var seg = route.segments[itS];
            for (var itSS = 0; itSS < seg.length; itSS++) {
                var item = seg[itSS];
                if (item instanceof PlaceHolderBase) {
                    var name = item.name;
                    if (!params.hasOwnProperty(name))
                        return null;
                    var param = params[name];
                    // BUG: g is not defined here... how can it be used in the next lines?
                    var c = ifUndef(param.current, g);
                    var t = param.target; // cannot coallesce to the global value... the user wants the value to be removed.
                    var d = ifUndef(param.default, g);

                    // c -> current value
                    // t -> target value
                    // d -> default value
                    // 
                    //  c   t   d | r   action      | explanation
                    // -----------+-----------------+-------------
                    //  -   -   - |     stop        | There is no value for the PlaceHolder, not even a default value. This route cannot be rendered without this.
                    //  a   -   - | a               | There is only a current value. Target and default don't exist. Using the current value for the PlaceHolder.
                    //  -   a   - | a               | There is only a target value. Current and default don't exist. Using the target value for the PlaceHolder.
                    //  -   -   a | a               | Only the default value exists. It's the default value, so we can use it for the PlaceHolder.
                    //  a   a   - | a               | Both current and target values are equal, and there is no default value. Use the value that exists.
                    //  a   b   - | b   clear c     | Both current and target values exist, but are different. Use target value, and clear all current values. ASP.NET behavior.
                    //  a   -   a | a               | Current value exists and is the same as the default value, and there is no target value. Use the current value.
                    //  a   -   b | a               | Current value exists and is different from default value, and there is no target value. Use the current value.
                    //  -   a   a | a               | Target value exists and is the same as the default value, and there is no current value. Use the target value.
                    //  -   a   b | a               | Target value exists and is different from default value, and there is no current value. Use target value.
                    //  a   a   a | a               | All values are the same. Use the value.
                    //  a   a   b | a               | Both current and target values are the same, but are different from the default. Use current/target value.
                    //  a   b   a | b               | Both current and target are defined and different from each other. Current is the same as the default. Use target value.
                    //  a   b   b | b               | Both current and target are defined and different from each other. Target is the same as the default. Use target value.
                    //  a   b   c | b               | All values are defined and different from each other. Use target value.

                    var nc = !c || fnc,
                        nt = !t,
                        nd = isUndefined(d),
                        ect = c == t || nc && nt,
                        etd = t == d || nt && nd,
                        edc = d == c || nd && nc;
                    var r0;
                         if (nc  && nt  && nd )          return null;
                    else if (!nc && nt  && nd )   r0 = c;
                    else if (nc  && !nt && nd )   r0 = t;
                    else if (nc  && nt  && !nd)   r0 = d;
                    else if (!nc && ect && nd )   r0 = t;
                    else if (!nc && !nt && nd ) { r0 = t; fnc = true; }
                    else if (edc && nt  && !nd)   r0 = c;
                    else if (!nc && nt  && !nd)   r0 = c;
                    else if (nc  && !nt && etd)   r0 = t;
                    else if (nc  && !nt && !nd)   r0 = t;
                    else if (edc && ect && !nd)   r0 = t;
                    else if (!nc && ect && !nd)   r0 = t;
                    else if (edc && !nt && !nd)   r0 = t;
                    else if (!nc && !nt && etd)   r0 = t;
                    else if (!nc && !nt && !nd)   r0 = t;
                    
                    param.used = true;
                    result.uriValues[name] = r0;
                    r0 = undefined;
                }
            }
        }

        // Checking remaining parameters, that were not used in the previous stage.
        // This means that no PlaceHolder had the same name as the paramenter.
        // These unused values will become either `data-tokens` or parts of the URI's `query-string` when it's built.
        for (var name in params) {
            var param = params[name];
            if (!param.used) {
                var g = param.global;
                var c = ifUndef(param.current, g);
                var t = param.target; // cannot coallesce to the global value... the user wants the value to be removed.
                var d = ifUndef(param.default, g);

                //  c   t   d | r   action      | explanation
                // -----------+-----------------+-------------
                //  -   -   - | -               | The remaining parameter don't have a value. Ignore it.
                //  a   -   - | -               | There is a current value, but the target is not defined. User want's the value removed, ignore it.
                //  -   a   - | a               | There is a target value, but no current nor default value. Include the target value, so it's rendered in the query-string.
                //  -   -   a |     stop        | Default value has no other matching value. This route didn't match.
                //  a   a   - | a               | There is a target value that equals the current value, but no default value. Include the value, so it's rendered in the query-string.
                //  a   b   - | b               | There is a target value different from current value, but no default value. Include the target value, so it's rendered in the query-string.
                //  a   -   a | -   data-token  | Default value matches the current value. Store the default value as a data-token.
                //  a   -   b |     stop        | Default value has no other matching value. This route didn't match.
                //  -   a   a | -   data-token  | Default value matches the target value. Store the default value as a data-token.
                //  -   a   b |     stop        | Default value has no other matching value. This route didn't match.
                //  a   a   a | -   data-token  | Default value matches both current and target values. Store the default value as a data-token.
                //  a   a   b |     stop        | Default value has no other matching value. This route didn't match.
                //  a   b   a |     stop        | Default value has no other matching value. This route didn't match.
                //  a   b   b | -   data-token  | Default value matches the target value. Current value doen't matter. Store the default value as a data-token.
                //  a   b   c |     stop        | Default value has no other matching value. This route didn't match.

                var nc = isUndefined(c),
                    nt = isUndefined(t),
                    nd = isUndefined(d),
                    ect = c == t || nc && nt || isNullOrEmpty(c) && isNullOrEmpty(t),
                    etd = t == d || nt && nd || isNullOrEmpty(t) && isNullOrEmpty(d),
                    edc = d == c || nd && nc || isNullOrEmpty(d) && isNullOrEmpty(c);
                var r1;
                     if (nc  && nt  && nd ) r1 = undefined;
                else if (!nc && nt  && nd ) r1 = undefined;
                else if (nc  && !nt && nd ) r1 = t;
                else if (nc  && nt  && !nd) return null;
                else if (!nc && ect && nd ) r1 = t;
                else if (!nc && !nt && nd ) r1 = t;
                else if (edc && nt  && !nd) { r1=undefined; result.dataTokens[name]=d; }
                else if (!nc && nt  && !nd) return null;
                else if (nc  && !nt && etd) { r1=undefined; result.dataTokens[name]=d; }
                else if (nc  && !nt && !nd) return null;
                else if (edc && ect && !nd) { r1=undefined; result.dataTokens[name]=d; }
                else if (!nc && ect && !nd) return null;
                else if (edc && !nt && !nd) return null;
                else if (!nc && !nt && etd) { r1=undefined; result.dataTokens[name]=d; }
                else if (!nc && !nt && !nd) return null;

                if (typeof r1 != 'undefined')
                {
                    param.used = true;
                    result.uriValues[name] = r1;
                    r1 = undefined;
                }
            }
        }

        return result;
    }

    function buildUri(route, data, basePath) {
        var uri = basePath;
        var tempUri = uri;
        for (var itS = 0; itS < route.segments.length; itS++) {
            var seg = route.segments[itS];
            tempUri += tempUri[tempUri.length-1] != "/" ? "/" : "";
            var segmentRequired = false;
            for (var itSS = 0; itSS < seg.length; itSS++) {
                var item = seg[itSS];
                if (item instanceof PlaceHolderBase) {
                    var name = item.name,
                        constraint = route.constraints && route.constraints[name],
                        def = route.defaults && route.defaults[name],
                        value = data.uriValues[name];

                    // !(A || B) <=> !A && !B
                    // !(A && B) <=> !A || !B
                    if (typeof def != 'undefined')
                        if (def != null && def != "" || value != null && value != "")
                            if (def != value)
                                segmentRequired = true;

                    if (!matchConstraint(constraint, value))
                        return null;

                    if (value) tempUri += encodeURIComponent(value);
                    delete data.uriValues[item.name];
                }
                else if (item instanceof Literal) {
                    segmentRequired = true;
                    tempUri += encodeURIComponent(item.value);
                }
            }

            if (segmentRequired)
                uri = tempUri;
        }

        var sep = '?';
        for (var name in data.uriValues) {
            var value = data.uriValues[name];
            delete data.uriValues[name];
            uri += uri[uri.length-1] != sep ? sep : "";
            sep = '&';
            uri += encodeURIComponent(name) + '=' + encodeURIComponent(value);
        }

        return uri;
    }

    function mergeMixin(n, o) {
        if (typeof n == 'function') {
            return n;
        }
    }

    function appendParam(v0, v1) {
        return isUndefined(v0) ? (v1||"")
            : isNullOrEmpty(v0) ? ";"+(v1||"")
            : v0+";"+(v1||"");
    }

    function getQueryValues(uri) {
        if (uri === null || uri === undefined)
            throw new Error("Uri cannot be null nor undefined.");
        uri = ""+uri;
        uri = uri.replace(new RegExp("^"+escapeRegExp(this.basePath.slice(0, -1))+"(?:\\/|$)", "g"), "~/");
        var qs = uri.split(/[?&]/g);
        uri = qs.splice(0,1)[0];
        qs = qs.map(function(x){
                return decodeURIComponent(x)
                    .replace(/\+/g, " ")
                    .replace('=', '&')
                    .split('&');
            });
        var qv = {};
        for (var it = 0; it < qs.length; it++) {
            var kv = qs[it],
                name = kv[0];
            qv[name] = appendParam(qv[name], kv[1]);
        }
        
        return { queryValues: qv, path: uri };
    }

    function toVirtualPath(path) {
        path=""+path;
        if (path.indexOf(this.basePath) == 0)
            return path.substr(this.basePath.length);
        return null;
    }

    function toAppPath(virtualPath) {
        virtualPath=""+virtualPath;
        if (virtualPath.indexOf("~/") == 0)
            return this.basePath + virtualPath.substr(2);
        return null;
    }




/*****************************************************************************************
**                                                                                      **
**    DEFINITION OF THE ROUTER OBJECT.                                                  **
**                                                                                      **
*****************************************************************************************/

    function Router(opts) {
        if (!(this instanceof Router))
            throw new Error("Must call 'Router' with 'new' operator.");

        // enclosed values for the following functions
        var _routes = [];

        // private function definitions, that depend on the above enclosed values
        function makeURI(currentRouteData, targetRouteData, opts) {
            opts = opts || {};
            for (var itR = 0; itR < _routes.length; itR++) {
                var route = _routes[itR];

                // getting data to use in the URI
                var data = bindUriValues.call(
                    this, route, currentRouteData, targetRouteData, this.globalValues);

                // building URI with the data
                var uri = null;
                if (data) uri = buildUri.call(
                    this, route, data, opts.virtual ? "~/" : this.basePath);

                if (uri) return uri;
            }

            throw new Error("No matching route to build the URI");
        }

        function matchRoute(uri, opts) {
            var details = opts && opts.verbose ? [] : null;
            var parts = getQueryValues.call(this, uri);
            // ASP.NET routing code (for reference):
            // http://referencesource.microsoft.com/#System.Web/Routing/ParsedRoute.cs
            for (var itR = 0; itR < _routes.length; itR++) {
                var route = _routes[itR];

                // Trying to match the route information with the given URI.
                // Convert the URI pattern to a RegExp that can
                // extract information from a real URI.
                var segments = route.segments;

                var segValues = route.match(parts.path);
                if (!segValues) {
                    if (details) details.push("Match failed: URI does not match");
                    continue;
                }

                var validation = validateSegmentValues(segments, route, segValues);
                if (validation) {
                    if (details) details.push(validation);
                    continue;
                }

                var values = getRouteValues(route, segments, segValues);
                var r = {}, t = {};

                // Copy route data to the resulting object.
                // Copying `dataTokens` to the tokens variable.
                extendDefined(t, route.dataTokens);

                // Copying the default values to the used values,
                // then overriding them with query values,
                // and finally overriding them with route data.
                extendDefined(r, route.defaults);
                extendDefined(r, parts.queryValues);
                extendDefined(r, values);

                return new RouteMatch(r, t, null, null);
            }

            return new RouteMatch(null, null, "No routes matched the URI.", details);
        };

        function addRoute(name, route) {
            if (typeof name !== 'string' && name != null
            || name === ""
            || /^\d+$/.test(name))
                throw new Error("Invalid argument: route name is invalid. name="+JSON.stringify(name));
            _routes.push(new Route(route));
            if (name)
                _routes[name] = route;
            // allow fluent route definitions
            return this;
        };

        function getRoute(idOrName) {
            return _routes[idOrName];
        };

        // values that will be used
        throwOnNullValue("globals", opts.globals);
        var routes = opts.routes,
            globalValues = opts.globals,
            basePath = opts.basePath,
            mixins = opts.mixins || [];

        // adding routes
        if (routes)
            for (var itR in routes)
                if (routes.hasOwnProperty(itR))
                    addRoute.call(this, routes instanceof Array && /^\d+$/.test(itR) ? null : itR, routes[itR]);




/*****************************************************************************************
**                                                                                      **
**    PUBLIC API OF THE ROUTER OBJECT.                                                  **
**                                                                                      **
*****************************************************************************************/

         // METHODS
        this.addRoute = addRoute.bind(this);
        this.getRoute = getRoute.bind(this);
        this.matchRoute = matchRoute.bind(this);
        this.makeURI = makeURI.bind(this);
        this.toVirtualPath = toVirtualPath.bind(this);
        this.toAppPath = toAppPath.bind(this);
        
        // PROPERTIES
        this.globalValues = globalValues || {};
        this.basePath =
            isUndefined(basePath) ? "~/" :
            isNullOrEmpty(basePath) ? "/" :
            ensureStringLimits('/', '/', basePath);
        this.mixins = mixins;

        // APPLYING THE MIX-INS
        // Must be the last thing done before freezing.
        for (var it = 0; it < mixins.length; it++)
            mixins[it].call(this);

        freeze(this);
    }




/*****************************************************************************************
**                                                                                      **
**    EXPORTING MODULE DEFINITIONS.                                                     **
**                                                                                      **
*****************************************************************************************/

    // Just return a value to define the module export.
    // This example returns an object, but the module
    // can return a function as the exported value.
    return {
        Router: Router,
        RouteError: RouteError,
        RouteMatch: RouteMatch
    };
}));
