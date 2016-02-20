"use strict";
(function() {
    var rgxStrToJson = /[\n\r\t\0\\\"]/g,
        objStrToJson = {"\r":"\\r","\n":"\\n","\t":"\\t","\0":"\\0","\\":"\\\\",'"':'\\"'};
    function JsonContext(parent) {
        this.parent = parent || null;
        if (!parent) this.indent = "";
    }
    JsonContext.prototype = {
            parent: null,
            indent: "  ",
            getIndent: function() {
                return (this.parent && this.parent.getIndent() || "") + this.indent;
            }
        };
    function Json() { }
    Json.Context = JsonContext;
    Json.prototype = {
        numberToJson: function(n) {
            return n.toString();
        },
        stringToJson: function(s) {
            return '"'
                + s.replace(rgxStrToJson, function(m) {return objStrToJson[m];})
                + '"';
        },
        markPropertyStart: function(p) {return "";},
        markPropertyEnd: function(p) {return "";},
        markObjectStart: function(o) {return "";},
        markObjectEnd: function(o) {return "";},
        ignoreProperty: function(o, p) {return false;},
        objectToJson: function(o, c) {
            var cc = new JsonContext(c),
                ccc = new JsonContext(cc),
                indent = c.getIndent(),
                it = 0,
                items = [];
            for (var k in o) {
                if (this.ignoreProperty(o, k)) continue;
                var val = this.toJson(o[k], ccc);
                if (val != null) {
                    var prop = this.toJson(k.toString()),
                        item = prop + ': ' + this.markPropertyStart(prop) + val + this.markPropertyEnd(prop);
                    items.push(item);
                }
            }
            if (!items.length)
                return "{}";
            var ln = items.map(function(item){return item.length;}).reduce(function(a,b){return a+b;}),
                hasNewLines = items.some(function(item){return /[\r\n\t]/g.test(item);}),
                ml = hasNewLines || ln+items.length*2>40,
                indent = ml ? cc.getIndent() : "",
                separator = ml ? ",\n"+indent : ", ";
            var json = this.markObjectStart(o) + '{';
            if (ml) json+='\n'+indent;
            for (var it = 0; it < items.length; it++) {
                if (it > 0) json += separator;
                json += items[it];
            }
            if (ml) json+='\n'+c.getIndent();
            json += '}' + this.markObjectEnd(o);
            return json;
        },
        arrayToJson: function(a, c) {
            if (a.length == 0)
                return "[]";
            var _this = this,
                cc = new JsonContext(c),
                items = a.map(function(item){return _this.toJson(item, cc);}),
                hasNewLines = items.some(function(item){return /[\r\n\t]/g.test(item);}),
                ln = items.map(function(item){return item.length;}).reduce(function(a,b){return a+b;}),
                ml = hasNewLines || ln+items.length*2>40,
                indent = ml ? cc.getIndent() : "",
                separator = ml ? ",\n"+indent : ", ";
            var json = '[';
            if (ml) json+='\n'+indent;
            for (var it = 0; it < items.length; it++) {
                if (it > 0) json += separator;
                json += items[it];
            }
            if (ml) json+='\n'+c.getIndent();
            json += ']';
            return json;
        },
        toJson: function (o, c) {
            if (o === null)
                return "null";
            if (o === undefined)
                return "undefined";
            if (o instanceof Array)
                return this.arrayToJson(o, c);
            if (typeof o === "number")
                return this.numberToJson(o);
            if (typeof o === "string")
                return this.stringToJson(o);
            if (typeof o !== "function")
                return this.objectToJson(o, c);
            return null;
        }
    };

    extend(this, { Masb: { Json: Json } });
})();
