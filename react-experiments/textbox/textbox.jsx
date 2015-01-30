var TextBox = React.createClass({
        mixins: [gearz],
        render: function() {
                var value = this.get("value");
                var setter = function(e) {
                        return this.set(e, "value", e.target.value);
                    }.bind(this);
                return (
                        <input type="textbox" onChange={setter} value={this.props.value} />
                    );
            }
    });
