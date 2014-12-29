function extend(o) {
    for (var it = 1; it < arguments.length; it++) {
        var arg = arguments[it];
        for (var k in arg)
            if (typeof o[k] == "object"
            && typeof arg[k] == "object"
            && arg[k].constructor == Object)
                extend(o[k], arg[k]);
            else
                o[k] = arg[k];
    }
    return o;
}
