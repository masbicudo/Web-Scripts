// Atom v0.0.1
// Author: Miguel Angelo
"use strict";

if (!Array.isArray) {
    Array.isArray = function (obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    }
}

function deepFreeze(o, opts) {
    if (typeof o === 'undefined' || o == null)
        return o;
    var prop, propKey;
    Object.freeze(o); // First freeze the object.
    for (propKey in o) {
        prop = o[propKey];
        // TODO: when not own property, clone it, and then freeze
        if (!o.hasOwnProperty(propKey)
            || !(typeof prop === 'object')
            || !(opts && Object.isFrozen(o) && opts.ignoreFrozen === false)) {
            // If the object is on the prototype, not an object, or is already frozen,
            // skip it. Note that this might leave an unfrozen reference somewhere in the
            // object if there is an already frozen object containing an unfrozen object.
            // To avoid this, use `opts`, and set it's `ignoreFrozen` to false
            continue;
        }

        deepFreeze(prop); // Recursively call deepFreeze.
    }
}

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


// quero ler dados do átomo como objetos normais do javascript
// para escrever valores no átomo (em modo de edição) usam-se cursores:
//      atom.edit(function (a) {
//          var personName = 'Miguel Angelo';
//          var personCursor = a.prop('people', personName);
//          var ageCursor = personCursor.prop('age');
//          ageCursor.set(15);
//          personCursor.set('age', 15);
//
//          var person = personCursor.get();
//          person.age = 15; // this may not work
//
//          var personNew = personCursor.get(true);
//          personNew.age = 15;
//          personCursor.set(personNew, { compareProps: ['age'] }); // compare only 'age' prop
//          personCursor.set(personNew, { compareProps: true }); // compare all props
//          personCursor.set(personNew); // compare all props by default
//      });

function Property(parent, name) {
    this.parent = parent;
    this.name = name;
}
Property.prototype = {
    prop: function () {
        var current = this;
        for(var it = 0; it < arguments.length; it++)
            current = new Property(current, arguments[it]);
        return current;
    },
    set: function () {
        var args = [].slice.call(arguments),
            val = args.pop(),
            current = this;
        if (current)
            for (;;) {
                var p = current.parent;
                if (!p) break;
                args.unshift(current.name);
                current = p;
            }

        var propVals = [],
            curVal = current.get();
        for (var it = 0; it < args.length; it++) {
            propVals.push(curVal);
            curVal = (curVal || undefined) && curVal[args[it]];
        }
        
        var pop = propVals.pop();
        if (typeof pop === 'object' && Object.isFrozen(pop)) {
            debugger;
            var name = args.pop(),
                oldVal = pop[name];
            if (oldVal !== val) {
                
            }
        }
        else {
            while (1) {
                var name = args.pop();
                if (typeof pop === 'undefined') {
                    pop = typeof name === 'number' ? [] : {};
                    pop[name] = val;
                    val = pop;
                    
                    if (!propVals.length)
                        break;

                    pop = propVals.pop();
                }
                else {
                    pop[name] = val;
                    return;
                }
            }
            current.set(val);
        }
    },
    get: function () {
        var args = [].slice.call(arguments),
            current = this;
        if (current)
            for (;;) {
                var p = current.parent;
                if (!p) break;
                args.unshift(current.name);
                current = p;
            }
        // at this point `current` is the root
        var curVal = current.get();
        for (var it = 0; it < args.length; it++)
            curVal = (curVal || undefined) && curVal[args[it]];
        return curVal;
    }
};

function Atom(d) {
    //debugger;
    d = deepClone(d, { ignoreFrozen: false });
    d = deepFreeze(d, { ignoreFrozen: false });
    var baseGet = this.get,
        baseSet = this.set;
    this.get = function() {
        if (arguments.length == 0)
            return d;
        return baseGet.apply(this, arguments);
    };
    this.set = function(val) {
        if (arguments.length == 1)
            d = val;
        else
            baseSet.apply(this, arguments);
    };
};
Atom.prototype = new Property();
