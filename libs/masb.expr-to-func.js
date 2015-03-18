/**
 * Creates a function that can extract the name of a variable from a ReferenceError.
 * @returns {function}
 *      A function that can extract the name of a variable from a ReferenceError .
 */
function getVarNameExtractor() {
    try {
        // trying to execute a function with an invalid reference
        (function(){'use strict'; return __x_16F2CC1174D54F6F9436F5DA2F9E045E;})();
    }
    catch (e) {
        // Read the error message, and build a method that can
        // extract the variable name from any error message.
        var escMsg = (e.message||"").replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        var rgxStr = escMsg.replace(/__x_16F2CC1174D54F6F9436F5DA2F9E045E/g, "(.*)");
        if (rgxStr !== escMsg) {
            var rgx = new RegExp(rgxStr, 'g');
            return function(error) {
                rgx.lastIndex = 0;
                var match = rgx.exec(error.message);
                return (match && match[1]) || null;
            }
        }
    }

    return null;
}

/**
 * Gets the name of the variables that are used in the passed Javascript expression.
 * @param expr {string}
 *      Javascript expression to extract variable names from.
 *      All invalid references in the expression are returned.
 * @param hintObj {object=}
 *      Optional object used as a hint of the kind of objects that will be used with the expression.
 * @returns {string[]}
 *      An array of strings containing the name of the variables in the expression.
 */
function getVarNames(expr, hintObj) {
    var vne = getVarNameExtractor();
    var names = (hintObj && Object.keys(hintObj)) || [];
    if (!vne)
        return names;

    // extracting each variable name,
    // resolving them one at a time,
    // by using ReferenceError messages
    while (true) {
        var func = Function.apply(
            null,
            names.concat([
                "'use strict';\n"+
                "return ("+expr+");"
            ]));

        try {
            func(hintObj);
            return names;
        }
        catch (e) {
            var missedName = vne(e);
            if (!missedName)
                return names;

            names.push(missedName);
        }
    }
}

/**
 * Creates a function that is equivalent to the given Javascript expression,
 * that accepts an object to get variables from.
 * @param expr (string)
 *      A Javascript expression, with variables that correspond to the fields of an object that it will receive.
 * @param hintObj (object=)
 *      Optional object used as a hint of the kind of objects that will be used with the expression.
 * @returns {function}
 *      Function that executes the Javascript expression, receiving an object which fields are used
 *      in place of the expression variables.
 */
function createEvaluator(expr, hintObj) {
    // getting the names of the variables inside the expression
    var names = getVarNames(expr, hintObj);

    // creating a function that receives each variable as a parameter
    var func = Function.apply(
        null,
        names.concat([
            "'use strict';\n"+
            "return ("+expr+");"
        ]));

    // creating a function that returns another function in the following format:
    //     function(o) { return func(o.x, o.y, o.z); }
    // where `func` is the above function
    var func2 = Function(
        "func",
        (
            "'use strict';\n"+
            "return function(o) {\n"+
                expr.replace(/^/gm, "  // ")+"\n"+
                "  return func("+names.map(function(x){return "\n    o."+x;}).join(",")+");\n"+
            "};"
        ));

    return func2(func);
}
