// Tests Framewok UI v1.0.0    2014-12-12
//  author: Miguel Angelo
"use strict";
function fnTestTableBuilder(graphFlow, TestClass) {

    function sumator(a,b) {
        return a + b;
    }

    function joiner(sep) {
        return function join(a,b) {
            return ''+a+sep+b;
        };
    }

    function jsonAttr(name, data) {
        return name+"='"+JSON.stringify(data).replace(/'/g,'&apos;')+"'";
    }
    function strAttr(name, str) {
        if (str === null || typeof str === 'undefined')
            return "";
        return name+"='"+str.replace(/'/g,'&apos;')+"'";
    }

    function BuildTable(testData) {
        var testsGrouped = {};
        var groups = [];
        for(var itR = 0; itR < testData.length; itR++) {
            var t = testData[itR],
                testName = t.ctx.testName || "Run w/o exceptions",
                g0 = testsGrouped[testName],
                g = g0 || [],
                r = {
                    result: t.value instanceof Error
                                ? { name: t.value.name,
                                    message: t.value.message,
                                    stack: t.value.stack }
                            : t.value && t.value.constructor == Object
                                ? JSON.stringify(t.value)
                                : t.value,

                    steps: t.ctx.steps,
                    checkpoints: t.ctx.checkpoints,
                    messages: t.ctx.messages,
                    isError: t instanceof graphFlow.Error,

                    cpErrors: t.ctx.checkpoints
                        .map(function(chk) {
                                return chk.error ? 1 : 0;
                            })
                        .reduce(sumator, 0),

                    errors: t.ctx.countMessages('error'),
                    warns: t.ctx.countMessages('warn'),
                    infos: t.ctx.countMessages('info')
                };
            if (!g0) {
                groups.push(g);
                testsGrouped[g.testName = testName] = g;
                g.testFn = t.ctx.testFn;
            }
            g.errors = (g.errors || 0) + (r.isError || r.cpErrors || r.errors ? 1 : 0);
            g.push(r);
        }

        groups = groups.sort(function(a,b){
            return a.testName < b.testName ? -1 :
                a.testName > b.testName ? +1 :
                0;
        });

        var html = "";

        html += "<table>";
        for(var itG = 0; itG < groups.length; itG++) {
            var group = groups[itG];
            html += "<tr>";
                var fnStr = group.testFn ? TestClass.funcToString(group.testFn) : "N/A";
                var detailsHeader = {
                    type: 'test-header',
                    fnStr: fnStr
                };
                html += "<td "+jsonAttr('data-details', detailsHeader)+">";
                    html += group.testName;
                html += "</td>";
            for(var itR = 0; itR < group.length; itR++) {
                var r = group[itR],
                    totalErrors = r.cpErrors + r.errors + (r.isError?1:0),
                    style = "background-color: #" + (
                        r.isError ?     'fbb' :
                        totalErrors ?   'fdb' :
                        r.warns ?       'ffb' :
                        r.infos ?       'bfd' :
                                        'cfb'),
                    icon = "<span class='icon icon-" + (
                        totalErrors ?   'error' :
                        r.warns ?       'warn' :
                        r.infos ?       'info' :
                                        'none') + "'>"+(totalErrors||r.warns||r.infos)+"</span>",
                    text =
                        r.isError ?     'err' :
                        totalErrors ?   'err' :
                        r.warns ?       'wrn' :
                        r.infos ?       'OK' :
                                        'OK',
                    details = {type:'test-run', run: r};
                html += "<td style='"+style+"' "+jsonAttr('data-details', details)+">";
                    html += text + icon;
                html += "</td>";
            }
            html += "</tr>";
        }
        html += "</table>";

        return html;
    }

    function BuildTables(testDataArray) {
        var html = "";
        for (var it = 0; it < testDataArray.length; it++) {
            if (testDataArray.length > 1)
                html += "<h3>test set #" + (it+1) + "</h3>";
            html += BuildTable(testDataArray[it]);
        }
        return html;
    }

    function BuildTestTables(testDataArray, document, output, details) {

        output.innerHTML = BuildTables(testDataArray);

        // adding event listeners
        {
            // #details
            details.addEventListener("mousedown", HideDetailsBox);

            // html
            var html = document.getElementsByTagName("HTML")[0];
            html.addEventListener("mousedown", HideDetailsBox);

            // td
            [].forEach.call(
                document.getElementsByTagName("TD"),
                function(td) {
                    td.addEventListener("mousedown", ShowDetailsBox);
                });
        }
    }

    function ShowDetailsBox(e) {
        e.stopPropagation();
        var nodeWithData = e.target;
        while (nodeWithData && !(data = nodeWithData.getAttribute("data-details")))
            nodeWithData = nodeWithData.parentNode;
        if (ShowDetailsBox.lastClicked === nodeWithData) {
            HideDetailsBox(e);
            return;
        }
        ShowDetailsBox.lastClicked = nodeWithData;
        var data = JSON.parse(data);
        
        var html = "";
        
        if (data.type === 'test-header') {
            html += "<pre>";
            html += data.fnStr
                .replace(/\&/g, '&amp;')
                .replace(/\</g, '&lt;')
                .replace(/\n/g, '<br />');
            html += "</pre>";
        }
        else if (data.type === 'test-run') {
            var lines = 0;
            html += "<span class='vert-section'>";
            for (var it = 0; it < data.run.steps.length+1; it++) {
                if (lines > 30) {
                    lines=0;
            html += "</span>";
            html += "<span class='vert-section'>";
                }
                var chk = data.run.checkpoints[it],
                    msgs = data.run.messages[it],
                    step = data.run.steps[it];
                if (chk) {
                    if (chk.error) {
                        lines++;
                        html += "<div style='color: red; padding-left: 10px; font-size: 10px;'>";
                            html += "checkpoint: "+chk.error;
                        html += "</div>";
                    }
                    else {
                        lines++;
                        html += "<div style='color: green; padding-left: 10px; font-size: 10px;'>";
                            html += "checkpoint: "+chk.asLambda || chk.funcName;
                        html += "</div>";
                    }
                }
                if (msgs) {
                    var remaining = msgs.length;
                    for(var itM = 0; itM < msgs.length; itM++, remaining--) {
                        if (lines > 25 && remaining > 10) {
                            lines=0;
            html += "</span>";
            html += "<span class='vert-section'>";
                        }
                        var msg = msgs[itM];
                            var classes = ['msg-'+msg.type];
                            if (msg.attr && msg.attr.classes)
                                [].push.apply(classes, msg.attr.classes);
                            var clsStr = classes.reduce(joiner(' '), "");
                        lines++;
                        html += "<div class='"+clsStr+"'>";
                            html += msg.msg;
                        html += "</div>";
                    }
                }
                if (step) {
                        lines++;
                        html += "<div>";
                            html += step;
                        html += "</div>";
                }
            }
            if (data.run.isError) {
                        var title = data.run.result.name === 'Error' ? data.run.result.stack : null;
                        lines++;
                        html += "<div class='main-error' "+strAttr('title', title)+">";
                        if (typeof data.run.result === 'string')
                            html += data.run.result;
                        else if (data.run.result.name === 'Error') {
                            html += data.run.result.message;
                            lines++;
                            html += "<div class='call-stack'>";
                                html += "call stack available";
                            html += "</div>";
                        }
                        html += "</div>";
            }
            html += "</span>";
        }

        details.innerHTML = html;

        var rectTarget = nodeWithData.getBoundingClientRect();
        var rectDetails = details.getBoundingClientRect();
        details.style.left = Math.max(
            rectTarget.left + 2,
            rectTarget.right - rectDetails.width - 2)+"px";
        details.style.top = (rectTarget.bottom+ 2)+"px";
        details.style.visibility = "visible";
    }

    function HideDetailsBox(e) {
        lastClicked = null;
        details.innerHTML = "";
        details.style.left = 0;
        details.style.top = 0;
        details.style.visibility = "hidden";
    }

    return BuildTestTables;
}