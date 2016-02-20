"use strict";
(function(p) {
    var test = p.test,
        exec = p.exec;
    
    var regAddG = /g/i,
        regRemG = /-g/i,
        regAddI = /i/i,
        regRemI = /-i/i,
        regAddM = /m/i,
        regRemM = /-m/i;

    p.clone = function(f) {
        f =  ((this.global || regAddG.test(f)) && !regRemG.test(f) ? 'g' : '')
            + ((this.ignoreCase || regAddI.test(f)) && !regRemI.test(f) ? 'i' : '')
            + ((this.multiline || regAddM.test(f)) && !regRemM.test(f) ? 'm' : '');
        return new RegExp(this.source, f);
    };
    
    p.test = function(str, pos) {
        if (arguments.length != 2)
            return test.apply(this, arguments);
        var rgx = this.global ? this : (this.asGlobal || (this.asGlobal = this.clone("g")));
        var old = rgx.lastIndex;
        rgx.lastIndex = pos;
        var result = test.apply(rgx, [str]);
        rgx.lastIndex = old;
        return result;
    };
    
    p.exec = function(str, pos) {
        if (arguments.length != 2)
            return exec.apply(this, arguments);
        this.lastIndex = pos;
        var result = exec.apply(this, [str]);
        return result;
    };
})(RegExp.prototype);

(function(p) {
})(Array.prototype);
