// Graph-Flow Extensions v1.0.0    2014-11-27
//  author: Miguel Angelo
function gfexEnableMarkers(graphFlow) {

    var oldMarker = graphFlow.marker,
        oldAcceptMarker = graphFlow.acceptMarker,
        oldDefaultInherit = graphFlow.defaultInherit;

    graphFlow.acceptMarker = gfAcceptMarker;
    graphFlow.marker = gfMarker;
    graphFlow.defaultInherit = gfMarkerInherit;

    function gfMarker() {
        var marks = [].slice.call(arguments);
        return function(fn) {
            var markers = fn.markers || [];
            var push = [].push;
            push.apply(markers, marks);
            fn.markers = markers;
            return fn;
        }
    }

    function gfAcceptMarker() {
        var acceptedMarks = [].slice.call(arguments);
        return function(fn) {
            var baseCombinator = fn.combinator;
            fn.combinator = function (g, argsFn, f) {
                // getting the function that defines the base behaviour
                var base = baseCombinator || this.defaultCombinator,
                    gof = base(g, argsFn, f);

                // gof will receive the base combinator as it's own combinator,
                // this means that gof will not be restricted to receiving marked results,
                // it will receive any kind of results, marked or not.
                gof.combinator = baseCombinator;

                // reading markers from f functions
                var markers = f
                    .map(function(ff){return ff.markers;})
                    .filter(function(ff){return ff;})
                    .reduce(function(a,b){return a.concat(b);}, []);

                //console.log('acceptMarker()', 'acceptedMarks', acceptedMarks, ' <= ', markers);
                var hasMarker = acceptedMarks.some(function(m) {
                    return markers.indexOf(m) >= 0;
                });
                //if (hasMarker)
                //    console.debug('hasMarker');
                
                return hasMarker ? gof : null;
            };
            return fn;
        }
    }

    function gfMarkerInherit(gof, g, f) {
        oldDefaultInherit.call(this, gof, g, f);

        // inheriting markers from all functions
        var markers = [];
        var push = [].push;
        push.apply(markers, g.markers);
        for(var it=0;it<f.length;it++)
            push.apply(markers, f[it].markers || []);
        gof.markers = this.distinct(markers);
    };

    return {
        disableMarkers: function() {
            if (graphFlow.marker !== gfMarker
            || graphFlow.acceptMarker !== gfAcceptMarker
            || graphFlow.defaultInherit !== gfMarkerInherit)
                throw new Error("Cannot disable markers, because other layers were added over it.");
            graphFlow.marker = oldMarker;
            graphFlow.acceptMarker = oldAcceptMarker;
            graphFlow.defaultInherit = oldDefaultInherit;
        }
    };
}