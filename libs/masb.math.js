(function() {
    this.vec2 = function vec2(x, y) {
        return new Vector2(x, y);
    };
    this.dot = function dot(va, vb) {
        return va.x*vb.x + va.y*vb.y;
    };
    function Vector2(x, y) {
        this.x = x;
        this.y = y;
    }
    Vector2.prototype = {
        x:0, y:0,
        norm: function(n) {
            if (n === 2) return this.length();
            if (n === Infinity) return Math.max(Math.abs(this.x), Math.abs(this.y));
            return Math.pow(Math.pow(this.x, n) + Math.pow(this.y, n), 1/n);
        },
        length: function() {
            return Math.sqrt(this.x*this.x + this.y*this.y);
        },
        div: function(n) {
            return new Vector2(this.x/n, this.y/n);
        },
        mul: function(n) {
            return new Vector2(this.x*n, this.y*n);
        },
        dot: function(v) {
            return this.x*v.x + this.y*v.y;
        },
        neg: function() {
            return new Vector2(-this.x, -this.y);
        },
        slope: function() {
            return this.y / this.x;
        },
        sign: function() {
            return new Vector2(Math.sign(this.x), Math.sign(this.y));
        },
        unit: function() {
            var len = this.length();
            return new Vector2(this.x/len, this.y/len);
        },
        normUnit: function(n) {
            n = typeof n === "undefined" ? 2 : n;
            var len = this.norm(n);
            return new Vector2(this.x/len, this.y/len);
        }
    };

    this.seg2 = function(x0, y0, x1, y1) {
        var a = arguments;
        if (a.length == 4)
            return new LineSegment2(x0, y0, x1, y1);
        else if (a.length == 2) {
            if (x0 instanceof Vector2) {
                if (y0 instanceof Vector2)
                    return new LineSegment2(x0.x, x0.y, y0.x, y0.y);
            }
        }
        else if (a.length == 1) {
            if (x0 instanceof Array)
                return new LineSegment2(x0[0], x0[1], x0[2], x0[3]);
            if (typeof x0 === "object") {
                if (typeof x0.x === "number" && typeof x0.y0 === "number" && typeof x0.y1 === "number")
                    return new LineSegment2(x0.x, x0.y0, x0.x, x0.y1);
                if (typeof x0.y === "number" && typeof x0.x0 === "number" && typeof x0.x1 === "number")
                    return new LineSegment2(x0.x, x0.y0, x0.x, x0.y1);
                if (typeof x0.x0 === "number" && typeof x0.x1 === "number" && typeof x0.y0 === "number" && typeof x0.y1 === "number")
                    return new LineSegment2(x0.x0, x0.y0, x0.x1, x0.y1);
            }
        }
        throw new Error("Invalid arguments: cannot create Vector2.");
    };
    function LineSegment2(x0, y0, x1, y1) {
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
    }
    LineSegment2.createFromArray = function(c) {
        return new LineSegment2(c[0], c[1], c[2], c[3]);
    };
    LineSegment2.createFromPointVec = function(p, v) {
        return new LineSegment2(p.x, p.y, p.x+v.y, p.y+v.y);
    };
    LineSegment2.createFromPoints = function(p0, p1) {
        return new LineSegment2(p0.x, p0.y, p1.x, p1.y);
    };
    LineSegment2.intersect = function(la, lo) {
        var dax = la.x1-la.x0,
            day = la.y1-la.y0,
            dox = lo.x1-lo.x0,
            doy = lo.y1-lo.y0,
            los = doy/dox,
            ma = (y - x*los)/(day - dax*los),
            r = Math.abs(ma) == Infinity ? null : new Vector2(la.x0 + dax*ma, la.y0 + day*ma);
        return r;
    };
    
    function getPoint(l, n) {
        var dx = l.x1-l.x0,
            dy = l.y1-l.y0,
            p = new Vector2(l.x0 + dx*n, l.y0 + dy*n);
        return p;
    }

    var intsq0 = (function(){
        //function equation(x0, dx, y0, dy, b, n) {
        //// Math.max(Math.abs(x0 + dx*n), Math.abs(y0 + dy*n)) = 1
        //    var x = x0 + dx*n,
        //        y = y0 + dy*n,
        //        ax = x < 0 ? -x : x,
        //        ay = y < 0 ? -y : y,
        //        m = ax < ay ? ay : ax,
        //        ret = m == b;
        //    return ret;
        //}
        
        //function (x0, dx, y0, dy, b, ret) {
        //// solve (Math.max(Math.abs(x0 + dx*n), Math.abs(y0 + dy*n)) = 1) for n
        //    m = ret ? [b] : [!=b];
        //    (ax, ay) = [
        //            ([<m], m),
        //            (m, [<m])
        //        ];
        //    (y, y) = [
        //            (-ay, [<0]),
        //            (ay, [>=0])
        //        ];
        //    (x, x) = [
        //            (-ax, [<0]),
        //            (ax, [>=0])
        //        ];
        //    (n, n) = ((y - y0)/dy, (x - x0)/dx);
        //    return n;
        //}
        
        function stepNN(t,t0,dt,u0,du,uGTE,uLT,n)
        {
            //(n, n) = ((t - t0)/dt, (u - u0)/du);
            var nTemp = (t - t0)/dt,
                u = u0 + nTemp*du; // (u - u0)/du == n
            if (u >= uGTE && u < uLT)
                n.push(nTemp);
        }
        function stepAuAt(t0,dt,u0,du,m,n)
        {
            //(au, at) = [
            //        ([<m], m), <=***
            //        (m, [<m])
            //    ];
            var at = m,
                auLT = m; // au < m;
            //(t, t) = [
            //        (-at, [<0]),
            //        (at, [>=0])
            //    ];
            if (at >= 0) {
                //(u, u) = [
                //        (-au, [<0]),
                //        (au, [>=0])
                //    ];
                //(n, n) = ((t - t0)/dt, (u - u0)/du);
                stepNN(-at,t0,dt,u0,du,-auLT,0,n);
                stepNN(-at,t0,dt,u0,du,0,auLT,n);
                stepNN(at,t0,dt,u0,du,-auLT,0,n);
                stepNN(at,t0,dt,u0,du,0,auLT,n);
            }
        }
        function solveForN(x0, dx, y0, dy, b, ret) {
            var n = [];
            //m = ret ? [b] : [!=b];
            if (ret) {
                stepAuAt(y0,dy,x0,dx,b,n);
                stepAuAt(x0,dx,y0,dy,b,n);
            }
            else {
                // This path is not useful for the purpose of this program
            }
            return n;
        }
        
        function arrayLastUnique(array) {
            return array.filter(function (a, b, c) {
                // keeps last occurrence
                return c.indexOf(a, b + 1) < 0;
            });
        }
        
        return function intsq(l) {
            var n = solveForN(l.x0, l.x1-l.x0, l.y0, l.y1-l.y0, 1, true);
            n = arrayLastUnique(n.sort(function(a,b){return a-b;}));
            var p = n.map(function(nI) { return getPoint(l, nI); });
            return p;
        }
    })();
    
    LineSegment2.prototype = {
        vec: function() {
            return new Vector2(this.x1-this.x0, this.y1-this.y0);
        },
        intersect: function(other) {
            return LineSegment2.intersect(this, other);
        },
        intsq: function() {
            return intsq0(this);
        },
        p0: function() {
            return new Vector2(this.x0, this.y0);
        },
        p1: function() {
            return new Vector2(this.x1, this.y1);
        }
    };
})();
