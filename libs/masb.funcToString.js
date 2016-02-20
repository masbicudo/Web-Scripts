"use strict";
// Function to String
function funcToString(fn, dblSpc) {
    var fnStr = fn.toString();
    var spc = /[\r\n]([\t ]+)\}$/g.exec(fnStr)[1];
    fnStr = fnStr.replace(new RegExp("^"+spc, "gm"), '');
    if (dblSpc)
        fnStr = fnStr.replace(/^\s+/gm, function(s) { return s+s; });
    return fnStr;
}
