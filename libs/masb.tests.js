// Tests Framewok v1.0.0    2014-11-27
//  author: Miguel Angelo
//  require: masb.flow.graph.v1.4.0.js
function createTestClass(graphFlow) {

    function doWith(o, f) { f.call(o); return o; }
    function distinct(array) {
        // http://stackoverflow.com/a/16065720/195417
        return array.filter(function (a, b, c) {
            // keeps first occurrence
            return c.indexOf(a) === b;
        });
    }

    function Tests() {
    var _this = this;
        this.tests = {};
        this.testContextCreator = function() {
                return new _this.TestContext();
            }
    }
    
    function toContextArgs(args, subArgs) {
        var fn0 = args[0];
        if (typeof fn0 === 'function') {
            var fn1 = function() {
                return fn0.apply(this, subArgs);
            };
            fn1.toString = fn1.toLocaleString = function() { return fn0.toString(); };
            args[0] = fn1;
        }
        return args;
    }

    Tests.prototype = {
        test: function(testName, func) {
                if (this.tests.hasOwnProperty(testName))
                    throw new Error("Cannot create two tests with the same name: '"+testName+"'.");
                this.tests[testName] = func;

                var func2 = function TestFunc() {
                    return func && func.apply(this, arguments) || undefined;
                };
                func2.testName = testName;
                func2.testFn = func;
                func2.executor =
                    function(fn, ctx, args) {
                        ctx.testFn = fn.testFn;
                        ctx.testName = fn.testName;
                        return this.executor(fn, ctx, args);
                    }
                return graphFlow.finalFunc(func2);
            },
        info: function(msg, attr) {
            var args = arguments;
            return function info() {
                this.info.apply(this, toContextArgs(args, arguments));
                return new graphFlow.Arguments(arguments);
            };
        },
        warn: function(msg, attr) {
            var args = arguments;
            return function warn() {
                this.warn.apply(this, toContextArgs(args, arguments));
                return new graphFlow.Arguments(arguments);
            };
        },
        error: function(msg, attr) {
            var args = arguments;
            return function error() {
                this.error.apply(this, toContextArgs(args, arguments));
                return new graphFlow.Arguments(arguments);
            };
        },
        log: function(msg, attr) {
            var args = arguments;
            return function log() {
                this.log.apply(this, toContextArgs(args, arguments));
                return new graphFlow.Arguments(arguments);
            };
        },
        debug: function(msg, attr) {
            var args = arguments;
            return function debug() {
                this.debug.apply(this, toContextArgs(args, arguments));
                return new graphFlow.Arguments(arguments);
            };
        },
        assert: function(fn, msg, attr) {
            var args = arguments;
            return function assert() {
                this.assert.apply(this, toContextArgs(args, arguments));
                return new graphFlow.Arguments(arguments);
            };
        },
        checkTrue: function(fn) {
                if (!fn.asLambda)
                    fn.asLambda = Tests.lambdaStr(fn);
                if (!fn.funcName)
                    fn.funcName = fn.name;
                if (!fn.funcStr)
                    fn.funcStr = Tests.funcToString(fn);
                return function() {
                    var cpdata = { fn: fn, funcStr: fn.funcStr, asLambda: fn.asLambda };
                    try { cpdata.ok = fn.apply(this, arguments) === true; }
                    catch (err) { cpdata.error = err; }
                    this.checkpoint(cpdata);
                    return new graphFlow.Arguments(arguments);
                };
            },
        TestContext: doWith(function TestContext() {
                this.steps = [];
                this.checkpoints = [];
                this.messages = [];
            }, function() {
                this.prototype = {
                    step: function(o) {
                        if (typeof o === 'string')
                            this.steps.push(o);
                        else if (typeof o ==='function') {
                            var s = Tests.lambdaStr(fn);
                            if (s)
                                this.steps.push(s);
                        }
                    },
                    checkpoint: function(cpdata) {
                        this.checkpoints[this.steps.length] = cpdata;
                    },
                    countMessages: function(type) {
                        return this.messages
                            .reduce(function(a,b){return a.concat(b);}, [])
                            .map(function(m){return m.type === type?1:0})
                            .reduce(function(a,b){return a+b;}, 0);
                    },
                    message: function(type, msg, attr) {
                        var msgByStepList = this.messages,
                            curStep = this.steps.length,
                            list = msgByStepList[curStep] || (msgByStepList[curStep] = []);
                        list.push({ type: type, msg: msg, attr: attr });
                    },
                    info: function(msg, attr) {
                        if (typeof msg == 'function') msg = msg();
                        this.message('info', msg, attr);
                    },
                    warn: function(msg, attr) {
                        if (typeof msg == 'function') msg = msg();
                        this.message('warn', msg, attr);
                    },
                    error: function(msg, attr) {
                        if (typeof msg == 'function') msg = msg();
                        this.message('error', msg, attr);
                    },
                    log: function(msg, attr) {
                        if (typeof msg == 'function') msg = msg();
                        this.message('log', msg, attr);
                    },
                    debug: function(msg, attr) {
                        if (typeof msg == 'function') msg = msg();
                        this.message('debug', msg, attr);
                    },
                    assert: function(fn, msg, attr) {
                        if (typeof msg == 'function') msg = msg();
                        if (!msg) {
                            var cls;
                            msg = Tests.lambdaStr(fn);
                            cls = 'code';
                            if (!msg) {
                                msg = fn.name;
                                cls = 'name';
                            }
                            attr = attr || {};
                            var classes = attr.classes || [];
                            classes.push(cls);
                            attr.classes = distinct(classes);
                        }
                        if (!fn.call(this))
                            throw msg;
                        this.message('success', msg, attr);
                    }
                };
            })
    };

    Tests.funcToString = function funcToString(fn) {
        var fnStr = fn.toString();
        var spc = /[\r\n]([\t ]+)\}$/g.exec(fnStr)[1];
        fnStr = fnStr.replace(new RegExp("^"+spc, "gm"), '');
        //fnStr = fnStr.replace(/^\s+/gm, function(s) { return s+s; });
        return fnStr;
    }

    Tests.lambdaStr = function lambdaStr(fn) {
        var rgx = /^function(?:\s+\w*\s*)?\([^\)]*\)\s+\{(?:\s+|debugger;|\/\/[^\r\n]*|\/\*(?:(?!\*\/).)+\*\/)+return\s+(.*);\s+\}$/g;
        var m = rgx.exec(fn.toString());
        return m[1];
    }

    return Tests;
}