var Pager = React.createClass({
        mixins: [gearz],
        render: function() {

                // 'get' is used to get properties that may be stored in 'state' or in 'props'
                // this happens when a value is defined throw a 'setter'

                var page = this.get("page");
                var pageCount = this.props.count / this.props.pageSize,
                    children = [];

                for (var it = 0; it < pageCount; it++) {

                    // 'setter' is used to create a function that changes the value of an
                    // attribute used by this component, raising events to notify parent
                    // components (if any), and with a default behaviour of storing changes
                    // in the component internal 'state'

                    var setter = this.setter("page", it+1);
                    children.push(
                        <div
                            className={[page-1==it?"current":"", "item"].join(' ')}
                            onMouseDown={setter}
                            key={"pg-"+it+1}>{it}</div>);
                }

                return (
                    <div className="pager">{children}</div>
                    );
            }
    });
