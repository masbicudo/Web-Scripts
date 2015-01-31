var Link = React.createClass({
        mixins: [gearz],
        render: function() {
                var target = this.props.target,
                    router = this.props.router,
                    onNavigate = this.props.onNavigate; // triggered when navigating through this link

                var info = router.getInfo(target);
                return (
                        <a href={info.uri}>{info.uri}</a>
                    );
            }
    });
