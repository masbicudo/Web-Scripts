// Deep cloning JSON or data objects 
// that may contain unknown object types
// frozen objects and objects that
// implement a clone or deepClone method
function deepClone(o, opts) {
    // http://jsfiddle.net/masbicudo/u92bmgnn/1/
    if (typeof o === 'undefined' || o == null)
        return o;

    var r, isCloned = false;
    if (Array.isArray(o)) r = [];
    else if (o instanceof Object && !(opts && Object.isFrozen(o) && opts.ignoreFrozen === true)) {
        if (o.__proto__ === {}.__proto__) r = {};
        else {
            var fnClone = o.deepClone || o.clone;
            if (fnClone) {
                r = fnClone.call(o);
                isCloned = true;
                if (!opts || typeof opts.ignoreCloneableProps === 'undefined') return r;
                if (opts.ignoreCloneableProps === true)
                    return r;
            }
        }
    }

    if (r) {
        for (var k in o)
            if (!isCloned || r[k] === o[k])
                r[k] = deepClone(o[k], opts);
        r.cloned = true;
        return r;
    }

    return o;
}
