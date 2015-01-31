// Masb Router Mixins    v0.1.0
//
//  This is responsible for extending the router,
//  to make it easier to use. The following mixins
//  are available in this file:
//
//   - location: allows the router to store the current URI,
//          and use it to get the current route data when needed.
//  

(function() {

    function getUriOrRouteDataInfo(value) {
        if (typeof value == 'string') {
            var routeData = this.getRouteDataFromURI(value);
            var uri = this.getURIFromRouteData(routeData);
            return Object.freeze({ routeData: routeData, uri: uri });
        }
        else if (typeof value == 'object') {
            var uri = this.getURIFromRouteData(value);
            var routeData = this.getRouteDataFromURI(uri);
            return Object.freeze({ routeData: routeData, uri: uri });
        }
        throw new Error("Invalid value passed to 'getUriOrRouteDataInfo'");
    }

    var mixins = Object.freeze({
        location: function() {
            var current = {};

            this.getUriOrRouteDataInfo = getUriOrRouteDataInfo.bind(this);

            this.setCurrentLocation = (function(value) {
                current = this.getUriOrRouteDataInfo(value);
            }).bind(this);

            this.getCurrentLocationInfo = (function() {
                return current;
            }).bind(this);

            var base = this.getURIFromRouteData;
            this.getURIFromRouteData = (function(target, opts) {
                if (arguments.length == 2 && typeof target == 'object' && typeof opts == 'object')
                    return base.call(this, current.routeData, target, opts);
                else if (arguments.length == 1 && typeof target == 'object')
                    return base.call(this, current.routeData, target);
                return base.apply(this, arguments);
            }).bind(this);
        }
    });

    window.routerMixins = window.routerMixins || {};
    for (var k in mixins)
        window.routerMixins[k] = mixins[k];

    return mixins;
})();