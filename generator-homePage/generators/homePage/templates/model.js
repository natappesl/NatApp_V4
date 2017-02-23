(function (parent){
    var <%= name %> = kendo.observable({
    });

    parent.set('<%= name %>', <%= name %>);
})(app.<%= parent %>);

// START_CUSTOM_CODE_<%= name %>
// END_CUSTOM_CODE_<%= name %>
