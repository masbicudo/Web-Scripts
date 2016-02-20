"use strict";
function Compiler() {
    var docs = [],
        grams = {};

    this.load = function(document, id) {
        id = "" + id;

        var el = document.getElementById(id),
            code = el.value || el.innerText || el.innerHTML;

        if (!el || (el.nodeName != "SCRIPT" && el.getAttribute("data-script") != null))
            throw "'id' must refer to a SCRIPT element, or and element with a 'data-type' attribute.";

        var type = el.nodeName == "SCRIPT" ? el.getAttribute("type") : el.getAttribute("data-type");
        var doc = docs[id] || { idx: null, code: code, type: type, result: null, parser: null };

        if (doc.idx == null) {
            doc.idx = docs.length;
            docs.push(doc);
        }
        else {
            // TODO:
            //      Replace file contents and enable recompilation of this file...
            //  fast recompilation can be done by diffing the new and old contents,
            //  so that the parser knows what productions have been affected.
            //      The parser must keep productions in a dictionary relating
            //  the offset in a doc and the production. Then, after diffing:
            //   - delete all productions of parts that changed from the dictionary;
            //   - update offsets of productions in parts that didn't change;
            //   - and finally parse the document again, to fill in the missing products.
        }

        docs[id] = doc;
    };

    this.addGrammar = function(grammar, type, parser) {
        grams[type] = { grammar: grammar, type: type, parser: parser };
    };

    this.compile = function(recompile) {
        for (var it = 0; it < docs.length; it++) {
            var doc = docs[it],
                gram = grams[doc.type],
                parser = (!recompile && doc.parser) || new gram.parser(doc.code),
                result = (!recompile && doc.result) || parser.parse(gram.grammar.Main);
            doc.parser = parser;
            doc.result = result;
        }
    };
    
    this.getDocumentResult = function(id) {
        return docs[id].result;
    };
    
    this.getAllErrors = function() {
        var allErrors = [];
        for (var it = 0; it < docs.length; it++) {
            var doc = docs[it];
            if (doc && doc.parser)
                Array.prototype.push.apply(allErrors, doc.parser.getErrors());
        }
        return allErrors;
    };
}

function RecursiveCodeParser(code, useCache) {
    useCache = useCache ? true : false;
    var pos = 0,
        stack = [],
        cache = [],
        root = { pos: 0, errors: [] };
    
    this.skip = function(rsf) {
        var len;
        if (rsf instanceof RegExp) {
            var m = rsf.exec(code.substring(pos));
            len = m ? m[0].length : 0;
        }
        else if (typeof rsf === "string") {
            len = rsf == code.substring(pos, pos + rsf.length) ? rsf.length : 0;
        }
        else if (typeof rsf === "function") {
            // `parse` already increments `pos`
            var p = this.parse(rsf, false, true);
            return p ? p.length : 0;
        }
        else
            throw "Argument 'rsf' must be: RegExp, String or Function.";

        pos += len;
        return len;
    };

    this.read = function(rsf) {
        var result;
        if (rsf instanceof RegExp) {
            var m = rsf.exec(code.substring(pos));
            result = m ? m[0] : "";
        }
        else if (typeof rsf === "string") {
            result = rsf == code.substring(pos, pos + rsf.length) ? rsf : "";
        }
        else if (typeof rsf === "function") {
            // `parse` already increments `pos`
            return this.parse(rsf, false, true).getCode();
        }
        else
            throw "Argument 'rsf' must be: RegExp, String or Function.";

        pos += result.length;
        return result;
    };

    this.is = function(rsf) {
        if (rsf instanceof RegExp)
            return rsf.test(code, pos);
        if (typeof rsf == "string")
            return rsf == code.substring(pos, pos + rsf.length);
        else if (typeof rsf === "function") {
            var oldPos = pos,
                p = this.parse(rsf, false, true);
            pos = oldPos;
            return p != null;
        }
        throw "Argument 'rsf' must be: RegExp, String or Function.";
    };

    function GetResultFromCache(f, aUseCache) {
        if (aUseCache) {
            var len = stack.length,
                peek = len ? stack[len-1] : root,
                errList = peek.errors;

            // cleaning cache of old results
            if (len == 0)
                for (var k in cache)
                    if (k < pos && typeof cache[k] == "number")
                        delete cache[k];

            // check cache for already existing results
            var c = cache[pos];
            if (c)
                for (var it = 0; it < c.length; it++)
                    if (c[it].func == f) {
                        var srcErr = c.errors;
                        if (srcErr)
                            Array.prototype.push.apply(errList, srcErr);
                        return c.result;
                    }
        }
        return null;
    }
    function CheckRecursion(f) {
        for (var it = stack.length; it > 0; it--) {
            var cs = stack[it-1];
            if (cs.pos != pos)
                break;
            if (cs.func == f)
                return true;
        }
        return false;
    }
    function getCode() {
        return code.substring(this.start, this.start + this.length);
    }
    function RegisterResult(f, result, aUseCache, clearErrors) {
        if (result == null || typeof result == "undefined")
            throw "NULL_RESULT";

        var se = stack.pop(),
            start = se.pos,
            len = pos - start,
            srcErr = se.errors,
            peek = stack.length ? stack[stack.length-1] : root;

        // adding some result fields
        result.start = start;
        result.length = len;
        result.getCode = getCode;

        if (!clearErrors && srcErr)
            Array.prototype.push.apply(peek.errors || (peek.errors = []), srcErr);

        if (aUseCache) {
            var c = cache[se.pos] || (cache[se.pos] = []);
            c.push({ func: f, result: result, errors: srcErr, length: len });
        }
    }
    function RegisterError(f, ex, aUseCache, clearErrors) {
        var se = stack.pop(),
            start = se.pos,
            len = pos - start,
            srcErr = se.errors || [],
            peek = stack.length ? stack[stack.length-1] : root,
            errList = peek.errors || (peek.errors = []);

        srcErr.push(ex);
        if (!clearErrors)
            Array.prototype.push.apply(errList, srcErr);

        pos = se.pos;

        if (aUseCache) {
            var c = cache[pos] || (cache[pos] = []);
            c.push({ func: f, result: null, errors: srcErr, length: len });
        }
    }

    this.parse = function(f, preventCache, clearErrors) {
        var vUseCache = useCache && !preventCache,
            cached = GetResultFromCache(f, vUseCache);
        if (cached)
            return cached;

        // recursions at the same position are not allowed
        if (CheckRecursion(f))
            throw "RECURSION_AT_SAME_POSITION";

        stack.push({ pos: pos, func: f });
        try {
            // 
            // CALLING THE PRODUCER FUNCTION
            // 
            var result = f.prodType
                ? f.apply(new f.prodType(), [this])
                : new f(this);

            RegisterResult(f, result, vUseCache, clearErrors);
            return result;
        }
        catch (ex) {
            if (typeof ex != "string")
                throw ex;
            RegisterError(f, ex, vUseCache, clearErrors);
            return null;
        }
    };
    
    this.clearError = function(err) {
        var peek = stack.length ? stack[stack.length-1] : root,
            errList = peek.errors;
        if (!errList)
            return false;
        for (var it = errList.length; it >= 0; it--)
            if (errList[it-1] == err) {
                errList.splice(it-1, 1);
                return true;
            }
        return false;
    };
    
    this.getErrors = function() {
        return root.errors;
    }
    
    this.getPos = function() {
        return pos;
    }
}

function RecursiveCodeParser_Cached(code) {
    RecursiveCodeParser.apply(this, [code, true]);
}

function defGrammar(BaseGrammar, extenderFn) {
    CustomGrammar.prototype = new BaseGrammar();
    function CustomGrammar() {
        BaseGrammar.apply(this);
        var g = this,
            base = extend({}, g);
        extend(g, extenderFn(g, base));
        g.resetPrototypes();
    }
    return CustomGrammar;
}

function Grammar() {
    //BaseFunc.apply(this);
    var g = this;
    //var base = extend({}, g);

    extend(g, {
        Main: function(parser) {
            if (!arguments.length) return;
            throw "EMPTY_GRAMMAR";
        },

        resetPrototypes: function() {
            g.Main.prototype = extend(new g.Product(), { _prodName: "Main" });
        }
    });

    g.resetPrototypes();
}

function Product(parser) {
    if (!arguments.length) return;
    throw new Error("`Product` is abstract.");
};
Product.prototype = { start: -1, length: -1, _prodName: "Product" };
Grammar.prototype = { Product: Product };
