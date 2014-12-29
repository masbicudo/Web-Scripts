// Graph Flow v1.4.1    2014-11-29
// Author: Miguel Angelo
// Licence:
//      Contact me to get a licence
//          -- OR --
//      Choose one of these open source licences: TODO: add open source licences
// Versions:
//  1.4.1   BUG: the same NoOp function cannot be used in multiple places, it must be replicated
//  1.4.0   Extensibility: inherit - allows the control of `gof` inherited properties from `g` and `f`
//  1.3.0   Extensibility: combinator, executor and context-creator
//  1.2.1   Inverted `gs`/`fs` loops to `fs`/`gs`: more performance, items in `fs` had independent data
//  1.2.0   Added a context to the functions (passed as `this`), added `createContext` function
//  1.1.0   Added NoOp and End functions, interned some others, ability to use null as NoOp
//  1.0.0   Initial version
function createGraphFlow() {
    const info = {
        version: { major:1, minor:2, patch:1, release: new Date(2014, 11, 27) },
        created: new Date(2014, 11, 25),
        authors: ["Miguel Angelo"]
    };
    var GF = GraphFlow;
    GF.info = info;
    GF.Error = gfError;
    GF.Result = gfResult;
    GF.Arguments = gfArguments;
    GF.NoOp = NoOp;
    GF.End = finalFunc(End);
    GF.finalFunc = finalFunc;
    GF.defaultCombinator = defaultCombinator;
    GF.defaultInherit = defaultInherit;
    GF.createContext = createContext;
    GF.executor = executor;
    GF.distinct = distinct;
    var push = Array.prototype.push;
    function GraphFlow() {
        var fs = normalize(argumentsToArray(arguments));
        return ycomb(fs);
    }
    function gfError(value, ctx) {
        this.value = value;
        this.ctx = ctx;
    }
    function gfResult(value, ctx) {
        this.value = value;
        this.ctx = ctx;
    }
    function gfArguments(args) {
        this.args = argumentsToArray(args);
    }
    function finalFunc(f) {
        f.isFinalFunc = true;
        return f;
    }
    function End() {
    }
    function NoOp() {
        return function NoOp() {
            // return all arguments to the next function in the chain
            return new gfArguments(arguments);
        }
    }
    function distinct(array) {
        // http://stackoverflow.com/a/16065720/195417
        return array.filter(function (a, b, c) {
            // keeps first occurrence
            return c.indexOf(a) === b;
        });
    }
    function concat(a, b) {
        return a.concat(b);
    }
    function normalize(fs) {
        return fs
            .map(function(f) {
                return typeof f === 'function' && typeof f.funcs === 'function'
                    ? f.funcs()
                    : [f];
            })
            .reduce(concat, [])
            .map(function(f){
                return f === null ? NoOp() : f;
            });
    }
    function normalizeArgs(args) {
        return args
            .map(function(arg) {
                return arg instanceof gfArguments
                    ? arg.args
                    : [arg];
            })
            .reduce(concat, []);
    }
    function argumentsToArray(args) {
        return [].slice.call(args);
    }
    function defaultCombinator(g, argsFn, f) {
        function GoF() {
            var args = argsFn.apply(this, arguments);
            return g.apply(this, args);
        };
        if (g.hasOwnProperty('inherit'))
            GoF.inherit = g.inherit;
        return GoF;
    }
    function defaultInherit(gof, g, f) {
        // `gof` inherits properties owned by `g`, if `gof` does not
        // already own a property with the same name from `g`.
        for (var k in g)
            if (!gof.hasOwnProperty(k) && g.hasOwnProperty(k))
                gof[k] = g[k];
    }
    function createContext(fn, mc) {
        return {};
    }
    function executor(fn, ctx, args, mc) {
        try {
            var ResultClass = fn.Result || mc&&mc.Result || this.Result || gfResult;
            return new ResultClass(fn.apply(ctx, args), ctx);
        }
        catch (ex) {
            var ErrorClass = fn.Error || mc&&mc.Error || this.Error || gfError;
            return new ErrorClass(ex, ctx);
        }
    }
    function ycomb(fs) {
        fs = distinct(fs);
        var fn = function MultiCombinator() {
            var gs = distinct(normalize(argumentsToArray(arguments)));
            var gofs = fs
                .map(function(f) {
                    if (typeof f === 'function') f = [f];
                    f = normalize(f);

                    var someIsFinal = f.some(function(ff) { return ff.isFinalFunc; });
                    if (someIsFinal) {
                        if (f.length == 1)
                            return f[0];
                        throw new Error("Cannot group functions with 'isFinalFunc' flag.");
                    }

                    return gs
                        .map(function(g) {
                            var gargsFn = function() {
                                var _this = this,
                                    fargs = arguments;
                                return normalizeArgs(
                                    f.map(function(ff) {
                                        return ff.apply(_this, fargs);
                                    }));
                            }

                            var combinator = g.combinator || GF.defaultCombinator || defaultCombinator;
                            var gof = combinator.call(GF, g, gargsFn, f);
                            if (gof) {
                                var inherit = gof.inherit || GF.defaultInherit || defaultInherit;
                                inherit.call(GF, gof, g, f);
                            }

                            return gof;
                        })
                        .filter(function(gof){return gof;});
                })
                .reduce(concat, []);
            return ycomb(gofs);
        };
        fn.callAll = function() {
            var _this = this,
                ctxCreator = this.createContext || GF&&GF.createContext || createContext,
                exec = this.executor || GF&&GF.executor || executor,
                args = normalizeArgs(argumentsToArray(arguments));
            return fs
                .map(function(f) {
                    var ctx = (f.createContext || ctxCreator).call(GF, f, _this);
                    return (f.executor || exec).call(GF, f, ctx, args, _this);
                });
        };
        fn.funcs = function() {
            return fs;
        };
        return fn;
    }
    return GF;
}
