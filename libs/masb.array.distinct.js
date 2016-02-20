"use strict";
// references:
//  - http://stackoverflow.com/a/16065720/195417
(function(plugins) {
    const info = {
        version: [1,0,0],
        release: new Date(2014, 11, 26),
        authors: ["Miguel Angelo", "Cœur"]
    };

    function keepFirstDistinctFilter(el, idx, arr) {
        return arr.indexOf(el) === idx;
    }

    function keepLastDistinctFilter(el, idx, arr) {
        return arr.indexOf(el, idx + 1) < 0;
    }

    var proto = Array.prototype;
    if (!proto.distinct) {
        var d = proto.distinct = function Distinct(opt) {
            var fn =
                typeof opt === 'undefined' ? keepFirstDistinctFilter
                : opt === 'last' ? keepLastDistinctFilter
                : opt === 'first' ? keepFirstDistinctFilter
                : null;
            if (!fn) throw new Error("Invalid options: must be 'first', 'last' or undefined.");
            return this.filter(fn);
        }
        d.info = info;
        if (plugins) plugins.masb_distinct = d;
    }

})();
