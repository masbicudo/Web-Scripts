// Atom Tests v0.0.2    2014-11-29
//  author: Miguel Angelo
//  require: masb.atom.v0.0.1.js
//  require: masb.flow.graph.v1.4.1.js
//  require: masb.testes.v1.0.0.js
function doAtomTests(graphFlow, TestClass)
{
    var tester = new TestClass(),
        test = tester.test.bind(tester);

    function HashObj(obj) {
        return JSON.stringify(obj)
            .replace(/[^\w\d]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    var h = HashObj({name: "Miguel Angelo", items: [1, 2, "xpto"]});

    function CreateAtom(o) {
        if (arguments.length == 1) return function() {
            this.step("CreateAtom-"+HashObj(o));
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
        testResults.push(result);
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
            fn.combinator = function(g, argsFn, f) {
                var gof = this.defaultCombinator(g, argsFn, f);
                gof.combinator = null;

                // reading markers from f functions
                var markers = f
                    .map(function(ff){return ff.markers;})
                    .filter(function(ff){return ff;})
                    .reduce(function(a,b){return a.concat(b);}, []);

                console.log('acceptMarker()', 'acceptedMarks', acceptedMarks, ' <= ', markers);
                var hasMarker = acceptedMarks.some(function(m) {
                    return markers.indexOf(m) >= 0;
                });
                if (hasMarker)
                    console.debug('hasMarker');
                
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
        console.log('defaultInherit()', 'gof.markers', gof.markers);
    };

    doSomeTests(
        graphFlow
            (CreateAtom())
            (checkIsAtom())
            (
                nop(),
                test("Root value after new empty atom", function(atom) {
                    this.assert(function() {
                        return typeof atom.get() === 'undefined';
                    });
                }),
                test("Prop value after new empty atom #1", function(atom) {
                    this.assert(function() {
                        return typeof atom.get('prop') === 'undefined';
                    });
                })
            )
            (
                graphFlow
                    // alternatives to set a property of the atom
                    (
                        // #1: set from the root
                        SetNamedPropTo('name', "MASB"),

                        // #2: go to the sub-property, set it, and then get back to the root
                        graphFlow
                            (SubProp('name'))
                            (
                                test("Prop value after new empty atom #2", function(prop) {
                                    this.assert(function() {
                                        return typeof prop.get() === 'undefined';
                                    });
                                }),
                                graphFlow
                                    (SetPropTo("MASB"))
                                    (
                                        test("Prop value after setting it #1", function(prop) {
                                            this.assert(function() {
                                                return prop.get() === "MASB";
                                            });
                                        }),
                                        GetParent
                                    )
                                    (checkIsAtom())
                            )
                    )
                    
                    // test that the property was set
                    (
                        test("Prop value after setting it #2", function(atom) {
                            this.assert(function() {
                                return atom.get('name') === "MASB";
                            });
                        })
                    ),
                graphFlow
                    (
                        nop(),
                        graphFlow
                            (
                                nop(),
                                graphFlow
                                    (marker('A')(SetPropPathTo(['people', 0, 'name'], "Miguel Angelo")))
                                    (
                                        nop(),
                                        test("Prop path after setting it #1", function(atom) {
                                            this.assert(function() {
                                                return atom.get('people', 0, 'name') === "Miguel Angelo";
                                            });
                                        })
                                    )
                            )
                            (
                                nop(),
                                marker('B')(SetPropPathTo(['people', 2, 'name'], "Maria Luiza"))
                            )
                            (
                                acceptMarker('A','B')(nop()),
                                acceptMarker('A')(test("Prop path after setting it #2", function(atom) {
                                    this.assert(function() {
                                        return atom.get('people', 0, 'name') === "Miguel Angelo";
                                    });
                                })),
                                acceptMarker('B')(test("Prop path after setting it #3", function(atom) {
                                    this.assert(function() {
                                        return atom.get('people', 2, 'name') === "Maria Luiza";
                                    });
                                }))
                            )
                    )
                    (
                        test("Prop path containing undefined array index #1", function(atom) {
                            this.assert(function() {
                                return typeof atom.get('people', 1) === 'undefined';
                            });
                        }),
                        test("Prop path containing undefined array index #2", function(atom) {
                            this.assert(function() {
                                return typeof atom.get('people', 1, 'name') === 'undefined';
                            });
                        })
                    )
            )
    );
    graphFlow.defaultInherit = prevInherit;

    return testResults.reduce(function(a,b){return a.concat(b);});
}
