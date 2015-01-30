var gearz = {
        getInitialState: function() {
                return {};
            },
        get: function(propName) {
            return this.state.hasOwnProperty(propName)
                ? this.state[propName]
                : this.props[propName];
            },
        set: function(e, propName, newValue) {
                var prevDef = false;
                var e1 = {
                    preventDefault: function() {
                        prevDef = true;
                    },
                    key: propName,
                    value: newValue,
                    previous: this.props[propName],
                    setValue: function(v){newValue=v;},
                    domEvent: e
                };
                Object.freeze(e1);

                var fn0 = this.props.onAnyChange;
                fn0 && fn0.call(this, e1);
                if (prevDef)
                    return;

                var name = propName == "value" ? "" : propName[0].toUpperCase()+propName.substr(1);
                var fnName = "on"+name+"Change";
                var fn1 = this.props.hasOwnProperty(fnName) && this.props[fnName];
                fn1 && fn1.call(this, e1);
                if (prevDef)
                    return;

                this.state[propName] = newValue;
                this.forceUpdate();
            },
        setter: function(propName, newValue) {
                return (function(e) {
                        return this.set(e, propName, newValue);
                    }).bind(this);
            }
    };
