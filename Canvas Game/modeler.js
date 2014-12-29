function Modeler() {
    if (!(this instanceof arguments.callee)) throw "Must call with 'new'";

    var gl;
    var program;
    var buffer;
    var positionAttribute;
    var currentTool;
    var uColor;

    var stateIndex = 0;
    var state0 = {
        coords: []
    };
    var state = state0;
    var states = [state];

    var DRAW_BACKGROUND = 0,
        DRAW_OVERLAY = 1;
    
    function setDrawTool(tool) {
        var prev = currentTool;
        currentTool = tool;

        // html
        var allToolEls = document.getElementsByClassName("tool");
        for (it=0; it < allToolEls.length; it++)
            allToolEls[it].children[0].setAttribute("class", "");
        if (tool)
            this.children[0].setAttribute("class", "current");
        draw();

        // sinking tool events
        prev && prev.toolUnselected && prev.toolUnselected(tool);
        tool && tool.toolSelected && tool.toolSelected(prev);
    }

    this.init = function init() {
        this.init = function(){};

        var elSimpleTool = document.getElementById("simple-tool");
        var elPenTool = document.getElementById("pen-tool");
        var elCompileTool = document.getElementById("compile-tool");
        var elDecompileTool = document.getElementById("decompile-tool");
        var elUndoTool = document.getElementById("undo-tool");
        var elRedoTool = document.getElementById("redo-tool");
        var elClearTool = document.getElementById("clear-tool");

        var elMainToolBar = document.getElementById("main-tool-bar");
        var defaultToolId = elMainToolBar.getAttribute("data-default");
        var elDefaultTool = document.getElementById(defaultToolId);

        elSimpleTool.onmousedown = function () {
            setDrawTool.apply(this, [ new SimpleTool() ]);
        };
        
        elPenTool.onmousedown = function () {
            setDrawTool.apply(this, [ new PenTool() ]);
        };
        
        elCompileTool.onmousedown = compile;
        elDecompileTool.onmousedown = decompile;
        elUndoTool.onmousedown = undo;
        elRedoTool.onmousedown = redo;
        elClearTool.onmousedown = clear;

        // short-cuts and other keystrokes
        document.addEventListener("keydown", function(e) {
            if (e.ctrlKey && e.keyCode === 90) {
                if (e.shiftKey) redo();
                else undo();
                e.preventDefault();
            }
        });

        // Setup canvas element
        var canvas = document.getElementById("canvas");

        var msedn = canvas.onmousedown;
        canvas.onmousedown = function(e) {
            msedn && msedn(e);
            var fn = currentTool.mousedown;
            if (currentTool && fn) {
                var x = mapPoint(e.offsetX, 0, e.target.width, -1, 1),
                    y = mapPoint(e.offsetY, 0, e.target.height, 1, -1);
                fn(x, y);
            }
        }

        var msemv = canvas.onmousemove;
        canvas.onmousemove = function(e) {
            msemv && msemv(e);
            var fn = currentTool.mousemove;
            if (currentTool && fn) {
                var x = mapPoint(e.offsetX, 0, e.target.width, -1, 1),
                    y = mapPoint(e.offsetY, 0, e.target.height, 1, -1);
                fn(x, y);
            }
        }
        
        // Get A WebGL context
        gl = getWebGLContext(canvas);
        if (!gl)
            return;

        gl.clearColor(1.0, 1.0, 1.0, 1.0);                      // Set clear color to white, fully opaque
        gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
        gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear the color as well as the depth buffer.

        // setup GLSL program
        var vertexShader = createShaderFromScriptElement(gl, "2d-vertex-shader");
        var fragmentShader = createShaderFromScriptElement(gl, "2d-fragment-shader");
        program = createProgram(gl, [vertexShader, fragmentShader]);
        gl.useProgram(program);

        buffer = gl.createBuffer();

        positionAttribute = gl.getAttribLocation(program, "aPosition");
        gl.enableVertexAttribArray(positionAttribute);

        uColor = gl.getUniformLocation(program, "uColor");

        // select the default tool
        elDefaultTool.onmousedown();
    }

    function getBoxVertex(p) {
        if (Math.abs(p.x) > Math.abs(p.y)) {
            if (p.x > 0) return vec2(1,-1);
            return vec2(-1,1);
        }
        if (p.y > 0) return vec2(1,1);
        return vec2(-1,-1);
    }
    function rotVertex(v) {
        return vec2(v.y, -v.x);
    }

    function SimpleTool() {
        if (!(this instanceof arguments.callee)) throw "Must call with 'new'";
        if (SimpleTool.instance)
            return SimpleTool.instance;
        SimpleTool.instance = this;

        this.mousedown = function(x, y) {
            pushState();
            state.coords.push(x);
            state.coords.push(y);
            draw();
        };

        this.drawToolLayers = function(gl, layer) {
            var a = state.coords;
            if (layer == DRAW_BACKGROUND && a.length >= 4) {
                var invert = (a.length/2) % 2 != 0;
                var line = seg2(a.slice(a.length-4, a.length));
                var ps = line.intsq();
                if (invert) ps.reverse();
                if (ps.length == 2) {
                    ps.splice(1, 0, line.p0(), line.p1());
                    var p1 = ps[ps.length-1],
                        p0 = ps[0];

                    var v = getBoxVertex(p1);
                    var vStop = getBoxVertex(p0);

                    var a = [];
                    while(v.x!=vStop.x || v.y!=vStop.y) {
                        a.push(v);
                        v = rotVertex(v);
                    }
                    
                    while (a.length)
                        ps.unshift(a.pop());
                    
                    var coords = [];
                    for (var it = 0; it < ps.length; it++)
                        coords.push(ps[it].x, ps[it].y);
                    
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
                    gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);
                    gl.uniform3fv(uColor, new Float32Array([1.0, 0.5, 0.5]));
                    gl.drawArrays(gl.TRIANGLE_FAN, 0, coords.length / 2);
                }
            }
        };

        this.toolSelected = function(prevTool) {
        };

        this.toolUnselected = function(selTool) {
        };
    }

    function PenTool(width, minDist, maxDist, minAngle, maxAngle) {
        if (!(this instanceof arguments.callee)) throw "Must call with 'new'";
        if (PenTool.instance)
            return PenTool.instance;
        PenTool.instance = this;

        var prevPoint;

        width    = width    || ( 5/800          );
        minDist  = minDist  || ( 3/800          );
        maxDist  = maxDist  || ( 100/800        );
        minAngle = minAngle || ( 5/180*Math.PI  );
        maxAngle = maxAngle || ( 30/180*Math.PI );
        
        this.mousedown = function(x, y) {
            prevPoint = [x, y];
            
            
            
            draw();
        };
        
        this.mousemove = function(e) {
        };

        this.drawToolLayers = function(gl, layer) {
        };

        this.toolSelected = function(prevTool) {
        };

        this.toolUnselected = function(selTool) {
        };
    }

    function compile() {
        var txt = document.getElementById("coords-text");
        var val = "";
        for (it = 0; it < state.coords.length; it+=2) {
            var x = state.coords[it],
                y = state.coords[it+1];
            val +=  (val ? ",\n" : "") + "- +"[Math.sign(x)+1] + Math.abs(x).toFixed(3) + ", " + "- +"[Math.sign(y)+1] + Math.abs(y).toFixed(3);
        }
        txt.value = "[\n"+val+"\n]";
    }

    function decompile() {
        var cmp = new Compiler();
        cmp.addGrammar(new MeshGrammar(), "mesh-code", RecursiveCodeParser_Cached);
        cmp.load(document, "coords-text");
        cmp.compile();
        var r = cmp.getDocumentResult("coords-text");
        var data = r.exec();
        pushState();
        state.coords = data;
        draw();
    }

    function undo() {
        stateIndex--;
        if (stateIndex < 0) stateIndex = states.length - 1;
        state = states[stateIndex];
        draw();
    }

    function redo() {
        stateIndex++;
        if (stateIndex >= states.length) stateIndex = 0;
        state = states[stateIndex];
        draw();
    }

    function clear() {
        stateIndex = 0;
        state = states[0];
        draw();
    }

    function pushState() {
        state = deepClone(state);
        stateIndex++;
        states = states.splice(0, stateIndex);
        states.push(state);
    }

    function deepClone(o, opts) {
        // http://jsfiddle.net/masbicudo/u92bmgnn/
        if (typeof o === 'undefined' || o == null)
            return o;

        // Array: a new array is create, and then child elements are cloned and added one by one
        // Frozen Objects: these can be ignored with the `ignoreFrozen` option set to true
        // Pure Object: a new pure-object is created, and then child elements are cloned and added one by one
        // Objects with `clone`/`deepClone` methods: `deepClone` is preferred over `clone` when both are present
        var r;
        if (Array.isArray(o)) r = [];
        else if (o instanceof Object && (!Object.isFrozen(o) || opts && !opts.ignoreFrozen)) {
            if (o.constructor === Object) r = {};
            else {
                var fnClone = o.deepClone || o.clone;
                if (fnClone) r = fnClone.call(o);
            }
        }

        if (r) {
            for (var k in o) {
                try { r[k] = deepClone(o[k], opts); }
                catch (ex) { };
            }
            return r;
        }
        return o;
    }

    function mapPoint(p, srcOrig, srcUnit, dstOrig, dstUnit) {
        return ((p - srcOrig) / srcUnit) * (dstUnit - dstOrig) + dstOrig;
    }

    function draw(beforeModel, afterModel) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var drawToolLayers = currentTool && currentTool.drawToolLayers;
        if (drawToolLayers) {
            drawToolLayers(gl, DRAW_BACKGROUND);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        if (state.coords.length >= 6) {
            beforeModel && beforeModel();

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(state.coords), gl.STATIC_DRAW);
            gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);
            gl.uniform3fv(uColor, new Float32Array([0,0,0]));
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, state.coords.length / 2);

            afterModel && afterModel();

            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        if (drawToolLayers) {
            drawToolLayers(gl, DRAW_OVERLAY);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }
    }

}
