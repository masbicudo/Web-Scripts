// Tests Framewok JSX-UI v1.0.0    2014-12-14
//  author: Miguel Angelo
function sumator(a,b) {
    return a + b;
}

function joiner(sep) {
    return function join(a,b) {
        return ''+a+sep+b;
    };
}

var HeaderDetailsBox = React.createClass({
        render: function() {
                return (
                    <pre>
                        {this.props.data.fnStr}
                    </pre> );
            }
    });

var DataDetailsBox = React.createClass({
        render: function() {
                var data = this.props.data;
                var cols = [],
                    rows = [];

                for (var it = 0; it < data.run.steps.length+1; it++) {
                    if (rows.length > 30) {
                        cols.push(
                            <span className='vert-section'>
                                {rows}
                            </span>);
                        rows=[];
                    }

                    var chk = data.run.checkpoints[it],
                        msgs = data.run.messages[it],
                        step = data.run.steps[it];

                    if (chk) {
                        if (chk.error) {
                            rows.push(
                                <div style={{color: 'red', paddingLeft: '10px', fontSize: '10px'}}>
                                    checkpoint: {chk.error}
                                </div>);
                        }
                        else {
                            rows.push(
                                <div style={{color: 'green', paddingLeft: '10px', fontSize: '10px'}}>
                                    checkpoint: {chk.asLambda || chk.funcName}
                                </div>);
                        }
                    }

                    if (msgs) {
                        for(var itM = 0, remaining = msgs.length;
                            itM < msgs.length;
                            itM++, remaining--)
                        {
                            if (rows.length > 25 && remaining > 10) {
                                cols.push(
                                    <span className='vert-section'>
                                        {rows}
                                    </span>);
                                rows=[];
                            }

                            var msg = msgs[itM];
                            var classes = ['msg-'+msg.type];
                            if (msg.attr && msg.attr.classes)
                                [].push.apply(classes, msg.attr.classes);
                            var clsStr = classes.reduce(joiner(' '), "");

                            rows.push(
                                <div className={clsStr}>
                                    {msg.msg}
                                </div>);
                        }
                    }

                    if (step) {
                        rows.push(
                            <div>
                                {step}
                            </div>);
                    }
                }

                if (data.run.isError) {

                    var title = data.run.result.name === 'Error'
                        ? data.run.result.stack
                        : null;

                    rows.push(
                        <div className="main-error" title={title}>
                            {
                            typeof data.run.result === 'string' ?
                                data.run.result :
                            data.run.result.name === 'Error' ?
                                [   data.run.result.message,
                                    <div className='call-stack'>
                                        call stack available
                                    </div> ] :
                            null
                            }
                        </div>);
                }

                cols.push(
                    <span className='vert-section'>
                        {rows}
                    </span>);

                return (
                    <div>
                        {cols}
                    </div>
                    );
            }
    });

function BuildTestGroups(testData) {
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
    
    return groups;
}

var TestHeader = React.createClass({
        render: function() {
                var _this = this;
                var group = this.props.group,
                    fnStr = group.testFn
                            ? TestClass.funcToString(group.testFn)
                            : "N/A",
                    detailsHeader = {
                            type: 'test-header',
                            fnStr: fnStr
                        },
                    onMouseDown = function(e) {
                        var fn = _this.props && _this.props.onShowDetailsBox;
                        fn && fn(e, detailsHeader);
                    };
                return (
                    <th data-details={JSON.stringify(detailsHeader)} onMouseDown={onMouseDown}>
                        {group.testName}
                    </th>
                    );
            }
    });

var TestData = React.createClass({
        render: function() {
                var _this = this;
                var r = this.props.r,
                    totalErrors = r.cpErrors + r.errors + (r.isError?1:0),
                    style = {
                        "backgroundColor": (
                            r.isError ?     '#fbb' :
                            totalErrors ?   '#fdb' :
                            r.warns ?       '#ffb' :
                            r.infos ?       '#bfd' :
                                            '#cfb')
                        },
                    iconClassName = "icon icon-" + (
                        totalErrors ?   'error' :
                        r.warns ?       'warn' :
                        r.infos ?       'info' :
                                        'none'),
                    text =
                        r.isError ?     'err' :
                        totalErrors ?   'err' :
                        r.warns ?       'wrn' :
                        r.infos ?       'OK' :
                                        'OK',
                    details = {type:'test-run', run: r},
                    onMouseDown = function(e) {
                        var fn = _this.props && _this.props.onShowDetailsBox;
                        fn && fn(e, details);
                    };
                return (
                    <td style={style} data-details={JSON.stringify(details)} onMouseDown={onMouseDown}>
                        {text}
                        <span className={iconClassName}>
                            {totalErrors||r.warns||r.infos}
                        </span>
                    </td>
                    );
            }
    });

var TestTable = React.createClass({
        render: function() {
                var testData = this.props.testData,
                    groups = BuildTestGroups(testData);
                return (
                    <table>
                        {groups.map(function(group) {
                            var fnStr = group.testFn
                                        ? TestClass.funcToString(group.testFn)
                                        : "N/A",
                                detailsHeader = {
                                        type: 'test-header',
                                        fnStr: fnStr
                                    };

                            return (
                                <tr key={group.testName}>
                                
                                    <TestHeader group={group} onShowDetailsBox={ShowDetailsBox} />
                                    
                                    {group.map(function(r, idx) {
                                        return (
                                            <TestData key={idx} r={r}
                                                onShowDetailsBox={ShowDetailsBox} />
                                            );
                                    })}
                                </tr>
                                );
                        })}
                    </table>
                    );
            }
    });

var TestTables = React.createClass({
        render: function() {
                var testDataArray = this.props.testDataArray,
                    children = [];

                for (var it = 0; it < testDataArray.length; it++) {
                    if (testDataArray.length > 1)
                        children.push(<h3 key={"h3-"+it+1}>test set #{it+1}</h3>);
                    children.push(<TestTable testData={testDataArray[it]} key={"tbl-"+it+1} />);
                }

                return (
                    <div>
                        {children}
                    </div>
                    );
            }
    });

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
    var details = document.getElementById('details');
    if (data.type === 'test-header') {
        React.render(
            <HeaderDetailsBox data={data} />,
            details
        );
    }
    else if (data.type === 'test-run') {
        React.render(
            <DataDetailsBox data={data} />,
            details
        );
    }

    var rectTarget = nodeWithData.getBoundingClientRect();
    var rectDetails = details.getBoundingClientRect();
    details.style.left = Math.max(
        rectTarget.left + 2,
        rectTarget.right - rectDetails.width - 2)+"px";
    details.style.top = (rectTarget.bottom+ 2)+"px";
    details.style.visibility = "visible";
}

function HideDetailsBox(e) {
    ShowDetailsBox.lastClicked = null;
    details.style.left = 0;
    details.style.top = 0;
    details.style.visibility = "hidden";
}

function BuildTestTables(testDataArray, document, output, details) {

    React.render(
        <TestTables testDataArray={testDataArray} />,
        output
    );

    // adding external event listeners
    {
        // #details
        details.addEventListener("mousedown", HideDetailsBox);

        // html
        var html = document.getElementsByTagName("HTML")[0];
        html.addEventListener("mousedown", HideDetailsBox);
    }
}
