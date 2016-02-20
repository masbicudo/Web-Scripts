// Graph Flow v1.7.0    2016-02-19
// Author: Miguel Angelo
// Licence:
//      Contact me to get a licence
//          -- OR --
//      Choose one of these open source licences: none
// Versions:
//  1.7.0   getCallers to get a function for each alternative (2016-02-19)
//  1.6.0   Catch combinator (2015-01-27)
//  1.5.0   Better flow syntax: sequence, alternate, combine (2014-11-30)
//  1.4.1   BUG: the same NoOp function cannot be used in multiple places, it must be replicated
//  1.4.0   Extensibility: inherit - allows the control of `gof` inherited properties from `g` and `fs`
//  1.3.0   Extensibility: combinator, executor and context-creator
//  1.2.1   Inverted `gs`/`ffss` loops to `ffss`/`gs`: more performance, items in `ffss` had independent data
//  1.2.0   Added a context to the functions (passed as `this`), added `createContext` function
//  1.1.0   Added NoOp and End functions, interned some others, ability to use null as NoOp
//  1.0.0   Initial version
"use strict";
function createGraphFlow() {
    const info = {
        version: { major:1, minor:7, patch:0, release: new Date(2016, 11, 30) },
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
    GF.defaultTransformer = identity;
    GF.defaultCombinator = valueCombinator;
    GF.defaultInherit = defaultInherit;
    GF.createContext = createContext;
    GF.executor = executor;
    GF.distinct = distinct;
    GF.sequence = sequence;
    GF.alternate = alternate;
    GF.combine = combine;
    GF.combinators = {
        valueCombinator: valueCombinator,
        catchCombinator: catchCombinator,
        funcCombinator: funcCombinator
    };
    GF.transformers = {
        identityTransformer: identity,
    };
    var push = Array.prototype.push;
    function GraphFlow() {
        var ffss = normalize(argumentsToArray(arguments));
        return alternativesCombinator(ffss);
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
    function finalFunc(fs) {
        fs.isFinalFunc = true;
        return fs;
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
    function normalize(ffss) {
        return ffss
            .map(function(fs) {
                return typeof fs === 'function' && typeof fs.funcs === 'function'
                    ? fs.funcs()
                    : [fs];
            })
            .reduce(concat, [])
            .map(function(fs){
                return fs === null ? NoOp() : fs;
            })
            .filter(function(fs){return typeof fs != 'undefined'});
    }
    function flattenArgs(dstArgs, srcArgs) {
        return srcArgs
            .forEach(function(sarg) {
                if (sarg instanceof gfArguments)
                    flattenArgs(dstArgs, sarg.args);
                else
                    dstArgs.push(sarg);
            });
    }
    function argumentsToArray(args) {
        return [].slice.call(args);
    }

    function identity(a) {
        return a;
    }

    function valueCombinator(g, argsFn, fs) {
        function GoF(/* arguments */) {
            var args = argsFn.apply(this, arguments);
            return g.apply(this, args);
        };
        if (g.hasOwnProperty('inherit'))
            GoF.inherit = g.inherit;
        return GoF;
    }
    valueCombinator.procArgs = identity;

    function doTransform(fs) {
        var transf = this.defaultTransformer || identity;
        if (typeof transf != 'function')
            throw new Error("Transformer must be a function.");
        return fs.map(function(f){
            var f2 = transf(f) || f;
            if (f2 != f) {
                var inherit = f.inherit || GF.defaultInherit;
                if (inherit) inherit.call(GF, f2, f, fs);
            }
            return f2;
        });
    }

    // BUG: catchCombinator should not be a combinator...
    // When there is no functions before the function marked with a combinator
    // it won't be applied. It is only use to combine two consecutive functions.
    // A try/catch should be applied even when there is only one function.
    function catchCombinator(g, argsFn, fs) {
        function GoF_catch() {
            var args = argsFn.apply(this, arguments);
            var err, val;
            
            try {
                val = g.apply(this, args);
            }
            catch (e) {
                err = e;
            }
            
            return { error: err, value: val };
        };
        if (g.hasOwnProperty('inherit'))
            GoF_catch.inherit = g.inherit;
        GoF_catch.combinator = valueCombinator;
        return GoF_catch;
    }
    catchCombinator.procArgs = identity;

    function funcCombinator(g, argsFn, fs) {
        // this is a special combinator that passes
        // `fs` functions to the `g` function,
        // in contrast with the value-combinator
        // that passes the values returned from the `fs`

        function gargsFn() {
            var _this = this,
                fargs = argumentsToArray(arguments);
            var result = fs
                .map(function(f) {
                    // return () => f(x(), y(), z())
                    return function() {
                        // resFArgs = [x(), y(), z()]
                        var resFArgs = fargs.map(function(x) {
                                return x();
                            }),
                            fresult = f.apply(_this, resFArgs);
                        if (fresult instanceof gfArguments)
                            throw "Cannot be gfArguments";
                        return fresult;
                    };
                });
            return result;
        }

        // G() => g(
        //          () => f0(x(), y(), z()),
        //          () => f1(x(), y(), z())
        //      )
        function G() {
            var args = gargsFn.apply(this, arguments);
            return g.apply(this, args);
        };
        if (g.hasOwnProperty('inherit'))
            G.inherit = g.inherit;
        return G;
    }
    funcCombinator.procArgs = function(args) {
        return args.map(function(arg) {
            return function() {
                return arg;
            };
        });
    }
    function canInheritProperty(dst, src, prop) {
        return !dst.hasOwnProperty(prop)
            && src.hasOwnProperty(prop)
            && (!src[prop] || !src[prop].notInheritable);
    }
    function defaultInherit(gof, g, fs) {
        // `gof` inherits properties owned by `g`, if `gof` does not
        // already own a property with the same name from `g`.
        for (var k in g)
            if (canInheritProperty.call(this, gof, g, k))
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

    // FLOW FUNCTIONS
    //  These function are used to construct the flow of code.
    //  Each one accepts multiple arguments, all being functions.
    //  What is done with each passed function, depends on the method:
    //      - sequence: the functions are called in sequence, one after the other
    //          sequence(f0, f1, f2) => [{f0();f1();f2();}]
    //          sequence() => [{}]
    //      - alternate: each function is one step in one alternating flow
    //          alternate(f0, f1, f2) => [{f0();}, {f1();}, {f2();}]
    //          alternate() => []
    //      - combine: the functions will be called in alternating flows, in different sequential orders
    //          combine(f0, f1) => [{f0();}, {f0();f1();}, {f1();}, {f1();f0();}]
    //          combine(1)(f0, f1) => same as above
    //          combine(2)(f0, f1) => [{f0();f1();}, {f1();f0();}]
    //          combine(0,1)(f0, f1) => [{}, {f0();}, {f1();}]
    //          combine(0,'GT')(f0, f1) => [{}, {f0();}, {f0();f1();}, {f1();}]
    //          combine(1,'GT')(f0, f1) => [{f0();}, {f0();f1();}, {f1();}]
    //          combine('GT')(f0, f1) => same as above
    //          combine(0)() => [{}]
    //          combine(1)() => []
    //          combine() => []
    function sequence() {
        var funcs = argumentsToArray(arguments);
        if (funcs.length) {
            var prev = GraphFlow;
            for (var it = 0; it < funcs.length; it++)
                prev = prev(funcs[it]);
            return prev;
        }
        else
            return NoOp();
    }
    function alternate() {
        return GraphFlow.apply(null, arguments);
    }
    function combineMinMax(funcs, min, max, nextFilter) {
        if (typeof nextFilter !== 'function') {
            function N(a, b) { return a !== b; }
            function GT(a, b) { return a > b; }
            if (typeof nextFilter === 'string')
                nextFilter = nextFilter == 'N' ? N
                            : nextFilter == 'GT' ? GT
                            : N;
            else
                nextFilter = N;
        }
        max = Math.min(max, funcs.length);
        min = Math.max(min, 0);
        if (min > max)
            return GraphFlow();
        if (max == 0)
            return GraphFlow(NoOp());
        var mc1plus = GraphFlow.apply(null, funcs
            .map(function(fs, i) {
                var mc1 = GraphFlow(fs);
                if (max == 1)
                    return mc1;
                var nextFns = funcs.filter(function(el, idx, arr) { return nextFilter(idx, i); });
                var mc2plus = mc1(combineMinMax(nextFns, Math.max(1,min-1), max-1, nextFilter));
                if (min > 1)
                    return mc2plus;
                return GraphFlow(fs, mc2plus);
            }));
        if (min == 0)
            return GraphFlow(NoOp(), mc1plus);
        return mc1plus;
    }
    function combine(min, max, nextFilter) {
        if (typeof min == 'number' || typeof max == 'number')
            return function() {
                var funcs = argumentsToArray(arguments);
                return combineMinMax(funcs, min, max, nextFilter);
            }
        else if (typeof max === 'string')
            return function() {
                var funcs = argumentsToArray(arguments);
                return combineMinMax(funcs, min, funcs.length, max);
            }
        else if (typeof min === 'string')
            return function() {
                var funcs = argumentsToArray(arguments);
                return combineMinMax(funcs, 1, funcs.length, min);
            }
        var funcs = argumentsToArray(arguments);
        return combineMinMax(funcs, 1, funcs.length, nextFilter);
    }

    function alternativesCombinator(ffss) {
        ffss = distinct(ffss);
        var fn = function MultiCombinator() {
            var gs = distinct(normalize(argumentsToArray(arguments)));
            gs = doTransform.call(GF, gs);
            var gofs = ffss
                .map(function(ffs) {
                    var fs = normalize(Array.isArray(ffs) ? ffs : [ffs]);

                    fs = doTransform.call(GF, fs);

                    // A final function is one that cannot be combined with others.
                    // For example, a test method that is intended to be the last
                    // thing to execute, can be marked with the `isFinal` flag.
                    // When composing the function, if the tester places something after
                    // the test function, an error will happen.
                    var someIsFinal = fs.some(function(f) { return f.isFinalFunc; });
                    if (someIsFinal) {
                        if (fs.length == 1)
                            return fs[0];
                        throw new Error("Cannot group functions with 'isFinalFunc' flag.");
                    }

                    // for each g in gs:
                    //  - value combinator:
                    //      gof(a,b,c,... z) => g(f0(a,b,c,... z), f1(a,b,c,... z), ... fn(a,b,c,... z))
                    //  - function combinator:
                    //      gof(a,b,c,... z) => g(
                    //          () => f0(a(),b(),c(),... z()),
                    //          () => f1(a(),b(),c(),... z()),
                    //          ...
                    //          () => fn(a(),b(),c(),... z()))
                    var result = gs
                        .map(function(g) {

                            function gargsFn() {
                                var _this = this,
                                    fargs = arguments,
                                    a = [];
                                flattenArgs(
                                    a,
                                    fs.map(function(f) {
                                        return f.apply(_this, fargs);
                                    }));
                                return a;
                            }

                            var combinator = g.combinator || GF.defaultCombinator,
                                gof = combinator.call(GF, g, gargsFn, fs);
                            if (gof) {
                                var inherit = gof.inherit || GF.defaultInherit;
                                if (inherit) inherit.call(GF, gof, g, fs);
                            }

                            return gof;
                        })
                        .filter(function(gof){return gof;});

                    return result;
                })
                .reduce(concat, []);
            return alternativesCombinator(gofs);
        };
        fn.callAll = function(/* arguments */) {
            return this.getCallers.apply(this, arguments).map(function(c){return c();});
        };
        fn.callAll.notInheritable = true;
        fn.getCallers = function(/* arguments */) {
            var _this = this,
                ctxCreator = this.createContext || GF&&GF.createContext || createContext,
                exec = this.executor || GF&&GF.executor || executor,
                args = [];
            flattenArgs(args, argumentsToArray(arguments));
            return ffss
                .filter(function(fs){return typeof fs != 'undefined';})
                .map(function(ffs) {

                    // Should we keep the following line?
                    //var fs = normalize(Array.isArray(ffs) ? ffs : [ffs]);
                    //var fs = Array.isArray(ffs) ? ffs : [ffs];

                    var fs = doTransform.call(GF, [ffs])[0];

                    execFn.contextCreator = function() {
                        return (fs.createContext || ctxCreator).call(GF, fs, _this);
                    }
                    function execFn(ctx) {
                        var args2 = fn && fn.combinator && fn.combinator.procArgs
                                ? fn.combinator.procArgs(args)
                                : args;

                        if (arguments.length == 0)
                            ctx = execFn.contextCreator();

                        return (fs.executor || exec).call(GF, fs, ctx, args2, _this);
                    };
                    return Object.freeze(execFn);

                });
        };
        fn.getCallers.notInheritable = true;
        fn.funcs = function() {
            var _this = this;
            ffss.forEach(function(fs) {
                if (Array.isArray(fs))
                    fs.forEach(function(f) {
                        defaultInherit.call(GF, f, _this);
                    });
                else
                    defaultInherit.call(GF, fs, _this);
            });
            return ffss;
        };
        fn.funcs.notInheritable = true;
        return fn;
    }
    return GF;
}
