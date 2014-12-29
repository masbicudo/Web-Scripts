BaseGrammar = defGrammar(Grammar, function(g, base) {
    return {
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
            if (!arguments.length) return;
            var space = parser.parse(g.Space),
                hasNewLine = space.strs
                    .map(function(x){ return x[0]=='/' ? false : g.newLineRegex.test(x); })
                    .reduce(function(a,b) { return a || b; });
            if (!hasNewLine)
                throw "NO_NEW_LINE";
        },

        Space_NoNewLine: function(parser) {
            if (!arguments.length) return;
            var space = parser.parse(g.Space),
                hasNewLine = space.strs
                    .map(function(x){ return x[0]=='/' ? false : g.newLineRegex.test(x); })
                    .reduce(function(a,b) { return a || b; });
            if (hasNewLine)
                throw "NEW_LINE_NOT_ALLOWED";
        },

        Name: function (parser) {
            if (!arguments.length) return;
            this.strName = parser.read(g.identifierRegex);
            if (this.strName.length == 0)
                throw "INVALID_NAME";
        },

        Number: function (parser) {
            // executes the current node in the AST
            this.exec = function() {
                return this.value;
            };

            if (!arguments.length) return;
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

        ArrayLiteral: function (parser) {
            // executes the current node in the AST
            this.exec = function() {
                var r = [];
                for (var it = 0; it < this.items.length; it++) {
                    r.push(this.items[it].exec());
                }
                return r;
            };

            if (!arguments.length) return;
            // parses the text and fills the node values
            if (parser.skip("[")) {
                this.items = [];
                var any;
                do {

                    any = null;
                    var node;

                    parser.skip(g.Space);
                    if (node = parser.parse(g.Number)) {
                        this.items.push(any = node);
                    }
                    if (parser.clearError("INVALID_NUMBER"))
                        break;
                    if (!parser.read(","))
                        break;

                } while (any);

                parser.skip(g.Space);
                if (parser.skip("]"))
                    return;

                throw "INVALID_ARRAY_LITERAL";
            }

            throw "NOT_ARRAY_LITERAL";
        },

        Main: function Main(parser) {
            this.exec = function() {
                return this.data.exec();
            };
            this.data = parser.parse(g.ArrayLiteral);
        },

        resetPrototypes: function() {
            base.resetPrototypes.apply(this);
            g.Product.prototype = extend(new base.Product(), {
                    exec: function() {
                        throw "NOT_EXECUTABLE";
                    }
                });
            g.Space.prototype = extend(new g.Product(), { strs: [] });
            g.Space_NewLine.prototype = new g.Space();
            g.Space_NoNewLine.prototype = new g.Space();
            g.Name.prototype = new g.Product();
            g.Number.prototype = new g.Product();
            g.ArrayLiteral.prototype = new g.Product();
        }
    };
});

MeshGrammar = defGrammar(BaseGrammar, function(g, base) {
    return {
        Main: function Main(parser) {
            this.exec = function() {
                return this.data.exec();
            };
            this.data = parser.parse(g.ArrayLiteral);
        },

        resetPrototypes: function() {
            base.resetPrototypes.apply(this);
            g.Main.prototype = new g.Product();
        }
    };
});

UnitGrammar = defGrammar(BaseGrammar, function(g, base) {
    return {
        Main: function Main(parser) {
            this.exec = function() {
                return this.data.exec();
            };
            this.data = parser.parse(g.Function);
        },

        resetPrototypes: function() {
            base.resetPrototypes.apply(this);
            g.Main.prototype = new g.Product();
        }
    };
});