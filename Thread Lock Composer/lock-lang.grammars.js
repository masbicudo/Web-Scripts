MyGrammar.prototype = new Grammar();
function MyGrammar() {
    Grammar.apply(this);
    var g = this,
        base = extend({}, g);

    extend(g, {
        spacesAndCommentsRegex: /^(?:(\s+)|(\/\/[^\r\n]*)|(\/\*(?:(?!\*\/).)*\*\/))/,
        newLineRegex: /[\r\n]/g,
        identifierRegex: /^(?:_|[^\W\d])[_\w\d]*/,

        Space: function(parser) {
            if (!arguments.length) return;
            var s, strs = this.strs;
            while (s = parser.read(g.spacesAndCommentsRegex))
                strs.push(s);
            if (strs.length == 0)
                throw "NO_SPACES";
        },

        Space_NewLine: function(parser) {
            var space = parser.parse(g.Space),
                hasNewLine = space.strs
                    .map(function(x){ return x[0]=='/' ? false : g.newLineRegex.test(x); })
                    .reduce(function(a,b) { return a || b; });
            if (!hasNewLine)
                throw "NO_NEW_LINE";
        },

        Space_NoNewLine: function(parser) {
            var space = parser.parse(g.Space),
                hasNewLine = space.strs
                    .map(function(x){ return x[0]=='/' ? false : g.newLineRegex.test(x); })
                    .reduce(function(a,b) { return a || b; });
            if (hasNewLine)
                throw "NEW_LINE_NOT_ALLOWED";
        },

        VarDecl: function (parser) {
            this.name = parser.parse(g.Name);
            if (parser.clearError("INVALID_NAME") || !this.name)
                throw "NOT_VAR_DECL";

            var assign = parser.parse(function() {
                parser.skip(g.Space);
                if (parser.skip("="))
                {
                    parser.skip(g.Space);
                    var expr = parser.parse(g.Expression);
                    if (expr) {
                        this.expr = expr;
                        return;
                    }
                }

                throw "NOT_ASSIGNMENT";
            }, true);

            this.initExpr = parser.clearError("NOT_ASSIGNMENT") ? null : assign.expr;
        },

        Name: function (parser) {
            this.strName = parser.read(g.identifierRegex);
            if (this.strName.length == 0)
                throw "INVALID_NAME";
        },

        VarDeclGroup: function (parser) {
            this.type = parser.parse(g.Name);
            if (parser.clearError("INVALID_NAME") || !this.type)
                throw "NOT_VARIABLE_DECLARATION";
            this.listDecl = [];
            while (true) {
                parser.skip(g.Space);
                var decl = parser.parse(g.VarDecl);
                if (parser.clearError("NOT_VAR_DECL") || !decl)
                    throw this.listDecl.length ? "INVALID_VARIABLE_DECLARATION" : "NOT_VARIABLE_DECLARATION";
                this.listDecl.push(decl);
                parser.skip(g.Space);
                if (!parser.read(','))
                    break;
            }
        },
        
        Label: function (parser) {
            this.name = parser.parse(g.Name);
            if (!parser.read(':'))
                throw "NOT_LABEL";
        },

        Number: function (parser) {
            var numStr = parser.read(/^[\+\-]?(?:\d+(?:\.\d*)?|\.\d+)/);
            if (!numStr)
                throw "INVALID_NUMBER";
            var letter = parser.read(/^[f]/);
            if (parser.is(/^[_\w\d]/))
                throw "INVALID_NUMBER";

            if (numStr.indexOf('.') >= 0 || letter == 'f') {
                var num = parseFloat(numStr);
                this.value = num;
                this.type = "Float";
            } else {
                var num = parseInt(numStr);
                this.value = num;
                this.type = "Int";
            }
        },
        
        Expression: function (parser) {
            var num = parser.parse(g.Number);
            if (num) {
                this.value = num;
                return;
            }

            if (parser.read(/^new\b/)) {
                if (parser.is(/^[_\w\d]/))
                    throw "INVALID_NEW";

                this.new = true;
                return;
            }

            throw "INVALID_EXPRESSION";
        },
        
        ProcDecl: function (parser) {
            if (parser.read("proc") && parser.skip(g.Space))
            {
                this.name = parser.parse(g.Name);
                if (!this.name)
                    throw "INVALID_PROCEDURE";
                parser.skip(g.Space);
                if (parser.skip("{")) {
                    this.statements = [];
                    var any;
                    do {

                        any = null;
                        var node;

                        while (node = parser.skip(g.Space) >= 0 && parser.parse(g.Statement))
                            this.statements.push(any = node);
                        if (parser.clearError("NOT_STATEMENT"))
                            break;

                    } while (any);

                    parser.skip(g.Space);
                    if (parser.skip("}"))
                        return;
                }
                
                throw "INVALID_PROCEDURE";
            }
            
            throw "NOT_PROCEDURE";
        },

        Statement: function (parser) {
            var node;
            parser.skip(g.Space) >= 0;
            if (node = parser.parse(g.VarDeclGroup))
                this.varDecl = node;
            if (parser.clearError("NOT_VARIABLE_DECLARATION") || !node)
                throw "NOT_STATEMENT";
        },

        Class: function (parser) {
            if (parser.read("class") && parser.skip(g.Space))
            {
                this.name = parser.parse(g.Name);
                parser.skip(g.Space);
                if (parser.skip("{")) {
                    this.procDecls = [];
                    this.varDecls = [];
                    var any;
                    do {

                        any = null;
                        var node;

                        parser.skip(g.Space) >= 0;
                        if (node = parser.parse(g.ProcDecl))
                            this.procDecls.push(any = node);
                        else if (parser.clearError("NOT_PROCEDURE") && (node = parser.parse(g.VarDeclGroup)))
                            this.varDecls.push(any = node);
                        else if (parser.clearError("NOT_VARIABLE_DECLARATION"))
                            break;

                    } while (any);

                    parser.skip(g.Space);
                    if (parser.skip("}"))
                        return;
                }
            }
            
            throw "NOT_CLASS";
        },

        Test: function (parser) {
            parser.skip(g.Space);
            if (parser.read("test") && parser.skip(g.Space))
            {
                this.name = parser.parse(g.Name);
                parser.skip(g.Space);
                if (parser.skip("{")) {
                    parser.skip(g.Space);
                    if (parser.skip("}"))
                        return;
                }
            }
            
            throw "NOT_TEST";
        },

        Main: function(parser) {
            this.classes = [];
            this.tests = [];
            
            var any;
            do {

                any = null;
                var node;

                while (node = parser.skip(g.Space) >= 0 && parser.parse(g.Class))
                    this.classes.push(any = node);
                parser.clearError("NOT_CLASS");

                while (node = parser.skip(g.Space) >= 0 && parser.parse(g.Test))
                    this.tests.push(any = node);
                parser.clearError("NOT_TEST");

            } while (any);
        },

        Product: function() {
        },
        
        resetPrototypes: function() {
            base.resetPrototypes.apply(this);

            function ProdJson() { }
            ProdJson.prototype = extend(new Masb.Json(), {
                    toJson: function(o, c) {
                        if (o instanceof g.Product)
                            return o.toJson(c);
                        if (o && typeof o.toJson === "function")
                            return o.toJson();
                        return Masb.Json.prototype.toJson.apply(this, [o, c]);
                    },
                    markObjectStart: function(o) {
                        return (o instanceof g.Product)
                            ? "/*<"+o._prodName+">*/"
                            : "";
                    },
                    markObjectEnd: function(o) {
                        return (o instanceof g.Product)
                            ? " /*</"+o._prodName+">*/"
                            : "";
                    },
                    ignoreProperty: function(o, p) {
                        return o instanceof g.Product && (p=="start" || p=="length" || p=="_prodName");
                    }
                });
            var json = new ProdJson();
            g.Product.prototype = extend(new base.Product(), {
                    toJson: function(c) {
                        c = c || new Masb.Json.Context();
                        return json.objectToJson(this, c);
                    }
                });

            g.Space.prototype = extend(new g.Product(), {_prodName: "Space", strs: []});
            g.Space_NewLine.prototype = extend(new g.Space(), {_prodName: "Space_NewLine"});
            g.Space_NoNewLine.prototype = extend(new g.Space(), {_prodName: "Space_NoNewLine"});
            g.VarDecl.prototype = extend(new g.Product(), {_prodName: "VarDecl"});
            g.Name.prototype = extend(new g.Product(), {_prodName: "Name"});
            g.VarDeclGroup.prototype = extend(new g.Product(), {_prodName: "VarDeclGroup"});
            g.Number.prototype = extend(new g.Product(), {_prodName: "Number"});
            g.Expression.prototype = extend(new g.Product(), {_prodName: "Expression"});
            g.ProcDecl.prototype = extend(new g.Product(), {_prodName: "ProcDecl"});
            g.Statement.prototype = extend(new g.Product(), {_prodName: "Statement"});
            g.Class.prototype = extend(new g.Product(), {_prodName: "Class"});
            g.Test.prototype = extend(new g.Product(), {_prodName: "Test"});
            g.Main.prototype = new base.Main();
        }
    });

    g.resetPrototypes();
}

MyGrammar2.prototype = new MyGrammar();
function MyGrammar2() {
    // Sample grammar that inherits the behaviour of another grammar,
    // and also changes some of the base behaviour.
    MyGrammar.apply(this);
    var g = this,
        base = extend({}, g);

    extend(g, {
        spacesAndCommentsRegex: /^(?:(\s+)|(#[^\r\n]*)|(\/\/[^\r\n]*)|(\/\*(?:(?!\*\/).)*\*\/))/,
        xmlDocComment: /^(?:(?:\/{3}(?!\/)([^\r\n]*))|(?:\/\*\*((?:[^*](?:(?!\*\/).)*)?)\*\/))$/,
        Space: function(parser) {
            if (!arguments.length) return;
            base.Space.apply(this, [parser]);
            this.docs = [];
            for (var it = 0; it < this.strs.length; it++) {
                var s = this.strs[it],
                    m = g.xmlDocComment.exec(s);
                if (m&&m.length)
                    this.docs.push(m[1]||m[2]);
            }
        },

        resetPrototypes: function() {
            base.resetPrototypes.apply(this);

            g.Space.prototype = extend(new base.Space(), { strs: [] });
        }
    });

    g.resetPrototypes();
}

// sample inheritance of grammar, using `defGrammar` to avoid boiler-plate code
MyGrammar3 = defGrammar(MyGrammar2, function(g, base) {
    return {
        spacesAndCommentsRegex: /^(?:(\s+)|(#[^\r\n]*)|(;[^\r\n]*)|(\/\/[^\r\n]*)|(\/\*(?:(?!\*\/).)*\*\/))/
    };
});
