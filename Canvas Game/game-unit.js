function DefineGameUnit() {
    this.DefineGameParts();
    this.DefineGameUnit = function(){};
    
    this.Unit = function Unit() {
    };
    Unit.prototype = {
        
        
        
        render: function() {
            /// <summary> Renders the unit in it's position. </summary>
            for (var it = 0; it < this.parts; it++) {
                var part = this.parts[it];
            }
        }
    };
}

function Unit001(gl, d) {
    var ts = [
        -0.727, +0.555,
        -0.722, +0.312,
        -0.075, +0.552,
        -0.037, +0.312,
        +0.485, +0.440,
        +0.442, -0.125,
        +0.742, -0.070,
        +0.682, -0.372,
        +0.915, -0.537,
        +0.712, -0.747,
        +0.855, -0.927,
        +0.410, -0.662,
        +0.295, -0.817,
        +0.100, -0.527,
        -0.500, -0.740,
        -0.605, -0.267,
        -0.785, -0.490,
        -0.625, -0.032,
        -0.822, +0.032,
        -0.217, +0.122,
        -0.702, +0.287,
        -0.245, +0.225
    ];

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, ts);
}