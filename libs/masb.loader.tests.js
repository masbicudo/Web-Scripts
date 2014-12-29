var lib = resource({ ref: "../libs/lib.js", type: "text/javascript" });

// Reads the file data to the memory if not cached already.
lib.load();

// Reads the file data to the memory replacing the old cache.
lib.reload();

// Gets the object that is described in the file, and stores it in a cache.
// This is done using: lib.exec(lib.eval(data))
lib.get();
lib(); // same as above

// Creates a new object described in the file, without reading/storing in the cache.
lib.new();
new lib(); // same as above

// If data was already loaded, then it will be in this field
var data = lib.data;
// If an object was evaluated from the file data, then it will be in this field
var obj = lib.obj;

// type can be inferred from the file extension: js => text/javascript
var refA = resource({ ref: "../libs/a.js", exec: function(fn) { return fn(); } }),
    refB = resource({ ref: "../libs/b.js", exec: function(fn) { return fn(refA); } }),
    refC = resource({ ref: "../libs/c.js", exec: function(fn) { return fn(refB); } }),
    refD = resource({ ref: "../libs/d.js", exec: function(fn) { return fn(refB, refC); } });

// adds an event handler to the 'ready' event of the 'refA' object
refA.ready(function(rdyA) {
    // setup 'a' object when a new one is created
    var a = rdyA.source.obj; // rdyA.source => refA
    a.setup({ /** My options **/ });
});

var evt = event
    // creates a composite event, adding a handler to both listed events
    .wait(refB.ready, refC.ready)
    // predefined condition to execute the handler (both events must be set)
    .all()
    // user defined condition to execute handler (in this case, equivalent to 'all')
    .condition(function(rdyB, rdyC) {
        return rdyB.isSet() && rdyC.isSet();
    })
    // removes all event handlers the first time it executes
    .once()
    // pre-processor that clears all event handlers (equivalent to 'once')
    .pre(function(rdyB, rdyC) {
        for (var itEvt = 0; itEvt < this.events.length; itEvt++)
            this.events[itEvt].remove(this.externalHandlers[itEvt]);
        this.handlers = [];
    });

// adds an event handler to the 'evt' event
evt(function(rdyB, rdyC) {
    // setup 'b' and 'c' objects when they both are ready
    var b = rdyB.source.obj, // rdyB.source => refB
        c = rdyC.source.obj; // rdyC.source => refC
    b.setOptions({ /** My options **/ });
    c(".my-control").init(b.getSomeUsefulValue());
});

// Calling refD as a function:
//  - load 'd.js' file and store it's data, if not already loaded
//  - evaluate the file and store the object, if not already evaluated
//  - execute the object, replacing the stored object, if not already executed
//  - call ready events if any, if not already raised
//  - return the object
var d = refD();

// Calling refD with new operator:
//  - load 'd.js' file and store it's data, if not already loaded
//  - evaluate the file
//  - execute the object
//  - call ready events if any
//  - return the object
var newD = new refD();

