// Atom Tests v0.1.0    2014-11-29
//  author: Miguel Angelo
//  require: masb.atom.v0.0.1.js
//  require: masb.flow.graph.v1.5.0.js
//  require: masb.testes.v1.0.0.js
"use strict";
function doAtomTests(graphFlow, TestClass)
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

    var h = HashObj({name: "Miguel Angelo", items: [1, 2, "xpto"]});

    function CreateAtom(o) {
        if (arguments.length == 1) return function() {
            this.step("CreateAtom-"+HashObj(o));
            //debugger;
            return this.atom = new Atom(o);
        };
        return function() {
            this.step("CreateAtom");
            return this.atom = new Atom();
        };
    }

    function SubProp(n) {
        return function SubProp(o) {
            this.step("Prop-"+HashObj(n));
            return this.prop = o.prop(n);
        };
    }

    function SetPropTo(v) {
        return function SetPropTo(o) {
            this.step("Set-"+HashObj(v));
            o.set(v);
            return o;
        };
    }

    function GetProp() {
        return function GetProp(a) {
            this.step("Get");
            return this.value = a.get();
        };
    }

    function SetNamedPropTo(n, v) {
        return function SetNamedPropTo(o) {
            this.step("Set-"+HashObj({N:n,V:v}));
            o.set(n, v);
            return o;
        };
    }

    function SetPropPathTo(p, v) {
        return function SetPropPathTo(o) {
            this.step("Set-"+HashObj({P:p,V:v}));
            o.set.apply(o, [].concat(p).concat([v]));
            return o;
        };
    }

    function GetParent(o) {
        this.step("Parent");
        return o.parent;
    }

    function checkIsAtom() {
        return tester.checkTrue(function isAtom(o) {
            return o instanceof Atom;
        });
    }

    var testResults = [];
    function doSomeTests(atomTests) {
        atomTests.createContext = tester.testContextCreator;
        var result = atomTests.callAll();
        //debugger;
        testResults.push(result);
    }

    function funcArgs(fn) {
        fn.combinator = graphFlow.combinators.funcCombinator;
        return fn;
    }

    function marker() {
        var marks = [].slice.call(arguments);
        return function(fn) {
            var markers = fn.markers || [];
            var push = [].push;
            push.apply(markers, marks);
            fn.markers = markers;
            return fn;
        }
    }

    function acceptMarker() {
        var acceptedMarks = [].slice.call(arguments);
        return function(fn) {
            var baseCombinator = fn.combinator;
            fn.combinator = function (g, argsFn, f) {
                // getting the function that defines the base behaviour
                var base = baseCombinator || this.defaultCombinator,
                    gof = base(g, argsFn, f);

                // gof will receive the base combinator as it's own combinator,
                // this means that gof will not be restricted to receiving marked results,
                // it will receive any kind of results, marked or not.
                gof.combinator = baseCombinator;

                // reading markers from f functions
                var markers = f
                    .map(function(ff){return ff.markers;})
                    .filter(function(ff){return ff;})
                    .reduce(function(a,b){return a.concat(b);}, []);

                //console.log('acceptMarker()', 'acceptedMarks', acceptedMarks, ' <= ', markers);
                var hasMarker = acceptedMarks.some(function(m) {
                    return markers.indexOf(m) >= 0;
                });
                //if (hasMarker)
                //    console.debug('hasMarker');
                
                return hasMarker ? gof : null;
            };
            return fn;
        }
    }

    var nop = graphFlow.NoOp;

    var prevInherit = graphFlow.defaultInherit;
    graphFlow.defaultInherit = function(gof, g, f) {
        prevInherit.call(this, gof, g, f);

        // inheriting markers from all functions
        var markers = [];
        var push = [].push;
        push.apply(markers, g.markers);
        for(var it=0;it<f.length;it++)
            push.apply(markers, f[it].markers || []);
        gof.markers = this.distinct(markers);
        //console.log('defaultInherit()', 'gof.markers', gof.markers);
    };

    var sequence = graphFlow.sequence,
        alternate = graphFlow.alternate,
        combine = graphFlow.combine;

    //debugger;
    var atom = new Atom({ people: [{ name: "Miguel Angelo" }] });
    atom.set('people', 0, 'name', "MASB");

    var tempFnNum = function(n) {
        return function() {
            return n;
        };
    };
    var tempFnAgg = function() {
        return function aggSum(x) {
            return x + 1;
        };
    };
    var tempFnMul = function() {
        return function(fn) {
            var x = 1;
            for (var it = 0; it < 5; it++)
                x *= fn();
            return x;
        }
    };
    var tempFnSum = function() {
        return function(fn) {
            var x = 0;
            for (var it = 0; it < 5; it++)
                x += fn();
            return x;
        }
    };
    var temp0 = sequence(
            sequence(
                alternate(
                    tempFnNum(1),
                    tempFnNum(2)
                ),
                tempFnAgg()
            ),
            funcArgs(alternate(
                tempFnSum(),
                tempFnMul()
            ))
        );
    debugger;
    var temp0_1 = temp0.callAll();
    debugger;

    var temp1 = sequence(
            alternate(
                tempFnNum(1),
                tempFnNum(2)
            ),
            sequence(
                tempFnAgg(),
                funcArgs(alternate(
                    tempFnSum(),
                    tempFnMul()
                ))
            )
        );
    debugger;
    var temp1_1 = temp1.callAll();
    debugger;

    var temp10 = sequence(
            func(
                sequence(
                    alternate(
                        tempFnNum(1),
                        tempFnNum(2)
                    ),
                    tempFnAgg()
                )
            ),
            alternate(
                tempFnSum(),
                tempFnMul()
            )
        );
    
    var someTest;
    var allTests = alternate(
            sequence(
                someTest = alternate(
                    // #1: empty atom
                    sequence(
                        marker('Atom#0')(CreateAtom()),

                        // tests with a new empty atom
                        alternate(
                            nop(),
                            // this test is coded as a sequence
                            sequence(
                                assert(function(atom) {
                                    return typeof atom.get() === 'undefined';
                                }),
                                test("Root value after new empty atom")
                            ),
                            // this test is coded as a function
                            test("Prop value after new empty atom #1", function(atom) {
                                this.assert(function() {
                                    return typeof atom.get('prop') === 'undefined';
                                });
                            })
                        )
                    ),

                    // #2: filled atom
                    sequence(
                        marker('Atom#1')(CreateAtom({ people: [{ name: "Miguel Angelo" },,{ name: "Maria Luiza" }]})),

                        // tests with a new atom with data
                        alternate(
                            nop(),
                            // this test is coded as a sequence
                            sequence(
                                assert(function(atom) {
                                    return typeof atom.get() !== 'undefined';
                                }),
                                test("Root value after new atom with data")
                            ),
                            // this test is coded as a function
                            test("Prop value after new atom with data #1", function(atom) {
                                this.assert(function() {
                                    return typeof atom.get('people') !== 'undefined';
                                });
                            })
                        )
                    )
                ),
                checkIsAtom(),

                alternate(
                    // #1: set property and test
                    sequence(
                        // alternatives to set a property of the atom
                        alternate(
                            // #1: set from the root
                            SetNamedPropTo('name', "MASB"),

                            // #2: go to the sub-property, set it, and then get back to the root
                            sequence(
                                SubProp('name'),
                                alternate(
                                    test("Prop value after new empty atom #2", function(prop) {
                                        this.assert(function() {
                                            return typeof prop.get() === 'undefined';
                                        });
                                    }),
                                    sequence(
                                        SetPropTo("MASB"),
                                        alternate(
                                            test("Prop value after setting it #1", function(prop) {
                                                this.assert(function() {
                                                    return prop.get() === "MASB";
                                                });
                                            }),
                                            GetParent
                                        ),
                                        checkIsAtom()
                                    )
                                )
                            )
                        ),
                        
                        // test that the property was set
                        alternate(
                            test("Prop value after setting it #2", function(atom) {
                                this.assert(function() {
                                    return atom.get('name') === "MASB";
                                });
                            })
                        )
                    ),

                    // #2: path operation tests (complex structures)
                    sequence(
                        alternate(
                            nop(),

                            // test set and get of complex properties
                            sequence(
                                combine(
                                    marker('A')(SetPropPathTo(['people', 0, 'name'], "Miguel Angelo")),
                                    marker('B')(SetPropPathTo(['people', 2, 'name'], "Maria Luiza"))
                                ),
                                alternate(
                                    acceptMarker('A','B')(nop()),
                                    acceptMarker('A')(test("Prop path after setting it #1", function(atom) {
                                        this.assert(function() {
                                            return atom.get('people', 0, 'name') === "Miguel Angelo";
                                        });
                                    })),
                                    acceptMarker('B')(test("Prop path after setting it #2", function(atom) {
                                        this.assert(function() {
                                            return atom.get('people', 2, 'name') === "Maria Luiza";
                                        });
                                    }))
                                )
                            )
                        ),

                        // test get path containing undefined array index 1
                        alternate(
                            // array item 1 must be undefined
                            test("Prop path containing undefined array index #1", function(atom) {
                                this.assert(function() {
                                    return typeof atom.get('people', 1) === 'undefined';
                                });
                            }),
                            // array item 1 properties must be undefined
                            test("Prop path containing undefined array index #2", function(atom) {
                                this.assert(function() {
                                    return typeof atom.get('people', 1, 'name') === 'undefined';
                                });
                            })
                        )
                    )
                )
            ),
            
            sequence(
            )
        );

    doSomeTests(allTests);
    doSomeTests(someTest);
    graphFlow.defaultInherit = prevInherit;

    return testResults;
}
