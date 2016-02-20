// Tests Framewok JSX-UI v1.0.3    2016-02-19
//  author: Miguel Angelo
// v1.0.3 - #2016-02-19#
//          added options not to run test on start (localstorage)
//          added button to run each test individually
// v1.0.2 - #2015-01-30#
//          added test counting
// v1.0.1 - corrected bug when displaying errors of type matching /.+Error$/
"use strict";
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
                    <div>
                        <pre>
                            {this.props.data.fnStr}
                        </pre>
                        <button onMouseDown={(e)=>{this.props.onRun();}}>run</button>
                    </div>);
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

                    var tip = data.run && data.run.result
                        ? data.run.result.stack
                        : null;

                    rows.push(
                        <div className="main-error" title={tip}>
                            {
                            typeof data.run.result === 'string' ?
                                data.run.result :
                            data.run && data.run.result && data.run.result.message ?
                                [   data.run.result.message,
                                    !tip ? null : (
                                        <div className='call-stack'>
                                            call stack available
                                        </div>
                                        )] :
                            null
                            }
                        </div>);
                }

                rows.push(
                        <button onMouseDown={(e)=>{this.props.onRun();}}>run</button>
                    );
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

function BuildItemData(fn, doTests) {
    var ctx = fn.contextCreator();
    ctx.isTestEnabled = doTests;
    var t = fn(ctx);

    var r = {
        fn: fn,

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
    return {r:r, t:t};
}

function BuildTestGroups(testFunctions, doTests) {
    var testsGrouped = {};
    var groups = [];
    for(var itR = 0; itR < testFunctions.length; itR++) {

        var fn = testFunctions[itR];
        var rt = BuildItemData(fn, doTests);
        var r = rt.r, t = rt.t;

        var
            testName = t.ctx.testName || "Run w/o exceptions",
            g0 = testsGrouped[testName],
            g = g0 || [];

        if (!g0) {
            groups.push(g);
            testsGrouped[g.testName = testName] = g;
            g.testFn = t.ctx.testFn;
        }
        g.errors = (g.errors || 0) + (r.isError || r.cpErrors || r.errors ? 1 : 0);
        g.push(rt);
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
                    <th onMouseDown={onMouseDown}>
                        {group.testName}
                    </th>
                    );
            }
    });

var TestItem = React.createClass({
        getInitialState: function() {
            return {};
        },
        render: function() {
                var _this = this;
                var doTests = this.props.doTests;
                if (typeof this.state.doTests != 'undefined')
                    doTests = this.state.doTests;
                var rt = this.props.rt;
                var r = this.state.r || rt.r,
                    totalErrors = r.cpErrors + r.errors + (r.isError?1:0),
                    style = {
                        "backgroundColor": (
                            r.isError ?     '#fbb' :
                            totalErrors ?   '#fdb' :
                            r.warns ?       '#ffb' :
                            r.infos ?       '#bfd' :
                            !doTests ?      '#dde' :
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
                        !doTests ?      'run' :
                                        'OK',
                    details = {type:'test-run', run: r},
                    onMouseDown = function(e) {
                        function runTestAgain(){
                            var newRT = BuildItemData(rt.r.fn, true);
                            _this.setState({r: newRT.r, doTests: true});
                        }
                        if (doTests) {
                            var fn = _this.props && _this.props.onShowDetailsBox;
                            fn && fn(e, details, runTestAgain);
                        }
                        else {
                            runTestAgain();
                        }
                    };
                return (
                    <td style={style} onMouseDown={onMouseDown}>
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
                var testFunctions = this.props.testFunctions,
                    doTests = this.props.doTests,
                    groups = BuildTestGroups(testFunctions, doTests);
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
                                <TestRow key={group.testName} group={group} doTests={doTests} />
                                );
                        })}
                    </table>
                    );
            }
    });

var TestRow = React.createClass({
        getInitialState: function() {
            return {};
        },
        render: function() {
                var doTests = this.state.doTests || this.props.doTests,
                    group = this.state.group || this.props.group;
                var _this = this;
                return (
                    <tr key={group.testName}>
                    
                        <TestHeader group={group} onShowDetailsBox={e => {
                        
                            function runGroupTestsAgain(){
                                var newGroup = [];
                                for(var k in group)
                                    if(group.hasOwnProperty(k))
                                        newGroup[k] = group[k];
                            for (var i = 0; i<newGroup.length; i++)
                                newGroup[i] = BuildItemData(newGroup[i].r.fn, true)
                                _this.setState({group: newGroup, doTests: true});
                            };

                            ShowDetailsBox(e, {type: 'test-header', fnStr: group.testFn.toString()}, runGroupTestsAgain);
                            
                        }} />
                        
                        {group.map(function(rt, idx) {
                            return (
                                <TestItem
                                    key={idx}
                                    rt={rt}
                                    onShowDetailsBox={ShowDetailsBox}
                                    doTests={doTests}
                                />
                                );
                        })}
                    </tr>
                    );
            }
    });

var TestTables = React.createClass({
        getInitialState: function() {
            return {childDoTests:[]};
        },
        render: function() {
                var groupedTestFunctions = this.props.groupedTestFunctions,
                    doTests = this.state.doTests || this.props.doTests,
                    children = [];
                var _this = this;

                children.push(<div className="total-count">Total tests:&nbsp;
                        {groupedTestFunctions.map(function(s){return s.length;}).reduce(sumator, 0)}
                        &nbsp;
                        <button onClick={(e)=>{this.setState({doTests:true});}}>run all</button>
                    </div>);
                for (var it = 0; it < groupedTestFunctions.length; it++) {
                    var eachDoTests = doTests || this.state.childDoTests[it];
                    var btn = (it) => {
                            var arr = [].slice.call(_this.state.childDoTests);
                            arr[it] = true;
                            return (<button onClick={(e)=>{this.setState({childDoTests:arr});}}>run</button>);
                        };
                    if (groupedTestFunctions.length > 1)
                        children.push(<h3 key={"h3-"+it+1}>test set #{it+1}&nbsp;
                                <span className="test-count">(tests: {groupedTestFunctions[it].length})</span>
                                &nbsp;
                                {btn(it)}
                            </h3>);
                    children.push(
                        <TestTable
                            key={"tbl-"+it+1}
                            testFunctions={groupedTestFunctions[it]}
                            doTests={eachDoTests}
                        />);
                }

                return (
                    <div>
                        {children}
                    </div>
                    );
            }
    });

function ShowDetailsBox(e, data, runTestFn) {
    e.stopPropagation();
    var nodeWithData = e.target;
    
    if (ShowDetailsBox.lastClicked === nodeWithData) {
        HideDetailsBox(e);
        return;
    }
    ShowDetailsBox.lastClicked = nodeWithData;
    var details = document.getElementById('details');

    if (data.type === 'test-header') {
        React.render(
            <HeaderDetailsBox data={data} onRun={runTestFn} />,
            details
        );
    }
    else if (data.type === 'test-run') {
        React.render(
            <DataDetailsBox data={data} onRun={runTestFn} />,
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

function BuildTestTables(groupedTestFunctions, document, output, details, doTests) {

    React.render(
        <TestTables groupedTestFunctions={groupedTestFunctions} doTests={doTests} />,
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
