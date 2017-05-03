(function (parent){
    var dataProvider = app.data.<%= dataProvider %>,
        /// start global model properties
        /// end global model properties
        fetchFilteredData = function (paramFilter, searchFilter) {
            var newSearchFilter;
 
            if (searchFilter) {
                if (searchFilter.value.includes(" ")) {
                    var searchValuesArray = searchFilter.value.split(" ");
                    var newFiltersArray = [];
        
                    searchValuesArray.forEach(function(searchValue) {
                        var newFilter = {
                            field: searchFilter.field,
                            operator: searchFilter.operator,
                            value: searchValue
                        };
                        newFiltersArray.push(newFilter);
                    });
        
                    newSearchFilter = {
                        logic: 'and',
                        filters: newFiltersArray
                    };
                } else {
                    newSearchFilter = searchFilter;
                }
            }
            var model = parent.get('<%= name %>'),
                dataSource;

            if (model) {
                dataSource = model.get('dataSource');
            } else {
                parent.set('<%= name %>_delayedFetch', paramFilter || null);
                return;
            }

            if (paramFilter) {
                model.set('paramFilter', paramFilter);
            } else {
                model.set('paramFilter', undefined);
            }

            if(paramFilter && newsearchFilter) {
                dataSource.filter({
                    logic: 'and',
                    filters: [paramFilter, newsearchFilter]
                });
            } else if (paramFilter || typeof newsearchFilter != "undefined") {
                dataSource.filter(paramFilter || newsearchFilter);
            } else {
                dataSource.filter({});
            }
        },
        <% if (source === 'everlive') { %>
        flattenLocationProperties = function (dataItem) {
            var propName, propValue,
                isLocation = function (value) {
                    return propValue && typeof propValue === 'object' &&
                        propValue.longitude && propValue.latitude;
                };

            for (propName in dataItem) {
                if (dataItem.hasOwnProperty(propName)) {
                    propValue = dataItem[propName];
                    if (isLocation(propValue)) {
                        dataItem[propName] =
                            kendo.format('Latitude: {0}, Longitude: {1}',
                                propValue.latitude, propValue.longitude);
                    }
                }
            }
        }, <% } %> <% if (isMapView) {%>
        getLocation = function(options) {
            var d = new $.Deferred();

            if (options === undefined) {
                options = {
                    enableHighAccuracy: true
                };
            }

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    d.resolve(position);
                },
                function(error) {
                    d.reject(error);
                },
                options);

            return d.promise();
        },
        defaultMapContainer = '<%= name %>Map',
        setupMapView = function(container) {
            if (!<%= name %>.map) {
                if (typeof container !== 'string') {
                    container = defaultMapContainer;
                }
                <%= name %>.map = L.map(container);
                <%= name %>.markersLayer = new L.FeatureGroup();

                var tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                    attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                    id: 'mapbox.streets',
                    accessToken: '<%= mapApiKey %>'
                });

                <%= name %>.map.addLayer(tileLayer);

                <%= name %>.map.addLayer(<%= name %>.markersLayer);
                <%= name %>.map.on('click', function (e) {
                    <%= name %>.set('itemDetailsVisible', false);
                });
            }

            addMarkersView();
        },
        addMarkersView = function(){
            getLocation()
                .then(function(userPosition) {
                    var marker,
                        currentMarker, currentMarkerIcon,
                        latLang,
                        position,
                        mapBounds,
                        data = <%= name %>.get('dataSource').data(),
                        userLatLang = L.latLng(userPosition.coords.latitude, userPosition.coords.longitude);

                    <%= name %>.map.setView(userLatLang, 15, {animate: false});
                    mapBounds = <%= name %>.map.getBounds();
                    <%= name %>.markersLayer.clearLayers();

                    for (var i = 0; i < data.length; i++) {
                        <% if (typeof geoPointFieldAdditional === 'undefined') { %>
                        position = data[i].<%= geoPointField %> || {};
                        <% } else { %>
                        position = {
                            longitude: data[i].<%= geoPointField %>,
                            latitude: data[i].<%= geoPointFieldAdditional %>
                        };
                        <% } %>

                        if (position.hasOwnProperty('latitude') && position.hasOwnProperty('longitude')) {
                            latLang = [position.latitude, position.longitude];
                        } else if (position.hasOwnProperty('Latitude') && position.hasOwnProperty('Longitude')) {
                            latLang = [position.Latitude, position.Longitude];
                        } else if (position.length == 2) {
                            latLang = [position[0], position[1]];
                        }

                        if(latLang && latLang[0] && latLang[1] && latLang[0] !== undefined && latLang[1] !== undefined) {
                            marker = L.marker(latLang, {
                                uid: data[i].uid
                            });
                            mapBounds.extend(latLang);
                            <%= name %>.markersLayer.addLayer(marker);
                        }
                    }

                    currentMarkerIcon = L.divIcon({
                        className: 'current-marker',
                        iconSize: [20, 20],
                        iconAnchor: [20, 20]
                    });

                    currentMarker = L.marker(userLatLang, {
                        icon: currentMarkerIcon
                    });

                    <%= name %>.markersLayer.addLayer(currentMarker);

                    <%= name %>.markersLayer.on('click', function (e) {
                        var marker, newItem;

                        marker = e.layer;
                        if(marker.options.icon.options.className.indexOf('current-marker') >= 0) {
                            return;
                        }

                        newItem = <%= name %>.setCurrentItemByUid(marker.options.uid);
                        <%= name %>.set('itemDetailsVisible', true);
                    });

                    <%= name %>.set('mapVisble', true);
                    <%= name %>.map.invalidateSize({reset: true});
                    <%= name %>.map.fitBounds(mapBounds, {padding: [20, 20]});
                    app.mobileApp.pane.loader.hide();
                })
                .then(null, function(error){
                    app.mobileApp.pane.loader.hide();
                    alert('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
                });
        },
        <% } %><% if (source === 'jsdo') { %>
        jsdoOptions = {
            name: '<%= collection %>',
            autoFill : false
        },<% } %>
        dataSourceOptions = {
        type: '<%= source %>',
        transport: {<% if (source === 'everlive') { %>
            typeName: '<%= collection %>',
            dataProvider: dataProvider<% } else if (source === 'sitefinity') { %>
                urlName: '<%= collection %>',<% if (typeof collectionProvider !== 'undefined' && collectionProvider) { %>
                providerName: '<%= collectionProvider %>',<% } %>
                dataProvider: dataProvider,<% } else if (source !== 'jsdo') { %>
            read: {
                url: dataProvider.url
            }<% } %>
        },<% if ((typeof group !== 'undefined' && group) && !endlessScroll) { %>
        group: { field: '<%= group %>' },<% } %><% if ((typeof imageField !== 'undefined' && imageField) || source === 'everlive') { %>
        change: function(e){
            var data = this.data();
            for (var i = 0; i < data.length; i++) {
                var dataItem = data[i];
                <% if (typeof imageField !== 'undefined' && imageField) { %>
                dataItem['<%= imageField %>Url'] =
                    processImage(dataItem['<%= imageField %>']);
                <% } %>
                <% if (source === 'everlive' && !isMapView) { %>
                    /// start flattenLocation property
                    flattenLocationProperties(dataItem);
                    /// end flattenLocation property
                <% } %>
            }
        },<% } %>
        error: function (e) {
            <% if (isMapView || source === 'jsdo') {%>app.mobileApp.pane.loader.hide();<%}%>
            if (e.xhr) {
                var errorText = "";
                try {
                    errorText = JSON.stringify(e.xhr);
                } catch (jsonErr) {
                    errorText = e.xhr.responseText || e.xhr.statusText || 'An error has occurred!';
                }
                alert(errorText);
            }<% if (source === 'jsdo') {%> else if (e.errorThrown) {
                alert(e.errorThrown);
            }<%}%>
        },
        schema: {<% if (source === 'json') { %>
            data: '<%= collection %>',<% } %>
            model: {
                fields: {<% var usedFields = {};
                    for (var i = 0; i < fields.length; i++) {
                    var f = fields[i];
                    if (f && !usedFields[f]) { %>
                    '<%= f %>': {
                        field: '<%= f %>',
                        defaultValue: ''
                    }, <% }
                    usedFields[f] = true;
                    } %>
                }<% if (typeof iconField !== 'undefined' && iconField) { %>
                    ,icon: function() {
                      var i = 'globe';
                      return kendo.format('km-icon km-{0}', i);
                    }<% } %>
            }
        },
        serverFiltering: true,<% if (serverSideSorting) { %>
        serverSorting: true,
        sort: { field: '<%= serverSideSortingField %>', dir: '<%= serverSideSortingDirection %>' },<% } %><% if ((typeof endlessScroll !== 'undefined' && endlessScroll) || serverSidePaging) { %>
        serverPaging: true,
        pageSize: <% if (serverSidePaging) { %><%= serverSidePagingSize %><% } else { %>50<% } %><% } %>
        },
        /// start data sources
        /// end data sources
        <%= name %> = kendo.observable({
            _dataSourceOptions: dataSourceOptions<% if (source === 'jsdo') { %>,
            _jsdoOptions: jsdoOptions<% } %>,<% if (typeof filterField !== 'undefined' && filterField) { %>
            searchChange: function (e) {
                var searchVal = e.target.value,
                    searchFilter;

                if(searchVal) {
                searchFilter = {field: '<%= filterField %>', operator: 'contains', value: searchVal};
            }
                fetchFilteredData(<%= name%>.get('paramFilter'), searchFilter);
            },
            searchDone: function(e) {
                $("#my-search-field").blur();
            },<% } %>
            fixHierarchicalData: function (data) {
                var result = {},
                    layout = {};

                $.extend(true, result, data);

                (function removeNulls(obj) {
                    var i, name,
                        names = Object.getOwnPropertyNames(obj);

                    for (i = 0; i < names.length; i++) {
                        name = names[i];

                        if (obj[name] === null) {
                            delete obj[name];
                        }
                        else if ($.type(obj[name]) === 'object') {
                            removeNulls(obj[name]);
                        }
                    }
                })(result);

                (function fix(source, layout) {
                    var i, j, name, srcObj, ltObj, type,
                        names = Object.getOwnPropertyNames(layout);

                    if ($.type(source) !== 'object') {
                        return;
                    }

                    for (i = 0; i < names.length; i++) {
                        name = names[i];
                        srcObj = source[name];
                        ltObj = layout[name];
                        type = $.type(srcObj);

                        if (type === 'undefined' || type === 'null') {
                            source[name] = ltObj;
                        }
                        else {
                            if (srcObj.length > 0) {
                                for (j = 0; j < srcObj.length; j++) {
                                    fix(srcObj[j], ltObj[0]);
                                }
                            }
                            else {
                                fix(srcObj, ltObj);
                            }
                        }
                    }
                })(result, layout);

                return result;
            },
            itemClick: function (e) {
                var dataItem = e.dataItem || <%= name%>.originalItem;

                <% if (typeof itemActionView !== 'undefined' && itemActionView && typeof itemActionPrimaryKey !== 'undefined' && itemActionPrimaryKey && typeof itemActionSecondaryKey !== 'undefined' && itemActionSecondaryKey) { %>
                    app.mobileApp.navigate('components/<%= itemActionView %>/view.html?filter=' + encodeURIComponent(JSON.stringify({field: '<%= itemActionSecondaryKey %>', value : dataItem.<%= itemActionPrimaryKey %>, operator: 'eq'})));
                <% } else { %>
                    app.mobileApp.navigate('#components/<%= parent %>/details.html?uid=' + dataItem.uid);
                <% } %>
            },<% if (addItemForm) { %>
            addClick: function () {
                app.mobileApp.navigate('#components/<%= parent %>/add.html');
            },<% } %><% if (editItemForm) { %>
            editClick: function () {
                var uid = this.originalItem.uid;
                app.mobileApp.navigate('#components/<%= parent %>/edit.html?uid=' + uid);
            },<% } %><% if (deleteItemButton) { %>
            deleteItem: function() {
                var dataSource = <%= name %>.get('dataSource');

                dataSource.remove(this.originalItem);

                dataSource.one('sync', function() {
                    app.mobileApp.navigate('#:back');
                });

                dataSource.one('error', function() {
                    dataSource.cancelChanges();
                });

                dataSource.sync();
            },
            deleteClick: function () {
                <% if (deleteItemConfirmation) { %>var that = this;<% } %>

                <% if (typeof _isMock !== 'undefined' && _isMock) { %>if (!navigator.notification) {
                    navigator.notification = {
                        confirm: function (message, callback) {
                            callback(window.confirm(message) ? 1 : 2);
                        }
                    };
                }<% } %>

                <% if (deleteItemConfirmation) { %>
                navigator.notification.confirm(
                    'Are you sure you want to delete this item?',
                    function( index ) {
                        //'OK' is index 1
                        //'Cancel' - index 2
                        if (index === 1) {
                            that.deleteItem();
                        }
                    },
                    '',
                    [ 'OK', 'Cancel' ]
                );<% } else {%>
                this.deleteItem();<% } %>
            },<% } %>
            detailsShow: function(e) {
                var uid = e.view.params.uid,
                    dataSource = <%= name %>.get('dataSource'),
                    itemModel = dataSource.getByUid(uid);

                <%= name %>.setCurrentItemByUid(uid);

                /// start detail form show
                /// end detail form show
            },
            setCurrentItemByUid: function(uid){
                var item = uid,
                    dataSource = <%= name %>.get('dataSource'),
                    itemModel = dataSource.getByUid(item);

                if (!itemModel.<%= (typeof detailHeaderField !== 'undefined' && detailHeaderField) || headerField || '_no_header_specified_' %>) {
                    itemModel.<%= (typeof detailHeaderField !== 'undefined' && detailHeaderField) || headerField || '_no_header_specified_' %> = String.fromCharCode(160);
                }

                /// start detail form initialization
                /// end detail form initialization

                <%= name %>.set('originalItem', itemModel);
                <%= name %>.set('currentItem',
                    <%= name %>.fixHierarchicalData(itemModel));

                return itemModel;
            },
            linkBind: function(linkString) {
                var linkChunks = linkString.split('|');
                if (linkChunks[0].length === 0) {
                    return this.get('currentItem.' + linkChunks[1]);
                }
                return linkChunks[0] + this.get('currentItem.' + linkChunks[1]);
            },
            /// start masterDetails view model functions
            /// end masterDetails view model functions
            currentItem: {}
        });

    <% if (addItemForm) { %>parent.set('addItemViewModel', kendo.observable({
        /// start add model properties
        /// end add model properties
        /// start add model functions
        /// end add model functions
        onShow: function (e) {
            this.set('addFormData', {
                /// start add form data init
                /// end add form data init
            });
            /// start add form show
            /// end add form show
        },
        onCancel: function () {
            /// start add model cancel
            /// end add model cancel
        },
        onSaveClick: function (e) {
            var addFormData = this.get('addFormData'),
                filter = <%= name %> && <%= name %>.get('paramFilter'),
                dataSource = <%= name %>.get('dataSource'),
                addModel = {};
            <% if (source === 'sitefinity') { %>
            if (filter && filter.value) {
                addModel.ParentId = filter.value;
            }
            <% } %>
           function saveModel(data) {
                /// start add form data save
                /// end add form data save
                <% if (source === 'sitefinity') { %>
                    var defaultField = addModel.<% if (typeof defaultField !== 'undefined' && defaultField) { %><%= defaultField %><% } else { %>Title<% } %>;
                    if (!addModel.UrlName && defaultField) {
                        // generate URL automatically
                        var regularExpression,
                            regExpFilter = '[^\\u0041-\\u005A\\u0061-\\u007A\\u00AA\\u00B5\\u00BA\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u0525\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0621-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0800-\\u0815\\u081A\\u0824\\u0828\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971\\u0972\\u0979-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D28\\u0D2A-\\u0D39\\u0D3D\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC\\u0EDD\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8B\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10D0-\\u10FA\\u10FC\\u1100-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F5\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1AA7\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u2094\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2D00-\\u2D25\\u2D30-\\u2D65\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u303B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31B7\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCB\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA65F\\uA662-\\uA66E\\uA67F-\\uA697\\uA6A0-\\uA6E5\\uA717-\\uA71F\\uA722-\\uA788\\uA78B\\uA78C\\uA7FB-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA80-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA2D\\uFA30-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC\\-\\!\\$\\(\\)\\=\\@\\d_\\\'\\.]+|\\.+$',
                            urlName = defaultField;
                        urlName = urlName.toLowerCase().trim();
                        if (urlName) {
                            regularExpression = new RegExp('^(' + regExpFilter + ')', 'g');
                            urlName = urlName.replace(regularExpression, '');
                            regularExpression = new RegExp('(' + regExpFilter + ')$', 'g');
                            urlName = urlName.replace(regularExpression, '');
                            regularExpression = new RegExp(regExpFilter, 'g');
                            urlName = urlName.replace(regularExpression, '-');
                        }
                        addModel.UrlName = urlName;
                    }
                <% } %>
                dataSource.add(addModel);
                dataSource.one('change', function (e) {
                    app.mobileApp.navigate('#:back');
                });

                dataSource.sync();
                app.clearFormDomData('add-item-view');
            };

            /// start add form save
            /// end add form save
            /// start add form save handler
            saveModel();
            /// end add form save handler
        }
    }));<% } %>

    <% if (editItemForm) { %>parent.set('editItemViewModel', kendo.observable( {
        /// start edit model properties
        /// end edit model properties
        /// start edit model functions
        /// end edit model functions
        editFormData: {},
        onShow: function (e) {
            var that = this,
                itemUid = e.view.params.uid,
                dataSource = <%= name %>.get('dataSource'),
                itemData = dataSource.getByUid(itemUid),
                fixedData = <%= name %>.fixHierarchicalData(itemData);

            /// start edit form before itemData
            /// end edit form before itemData

            this.set('itemData', itemData);
            this.set('editFormData', {
                /// start edit form data init
                /// end edit form data init
            });

            /// start edit form show
            /// end edit form show
        },
        linkBind: function(linkString) {
            var linkChunks = linkString.split('|');
            if (linkChunks[0].length === 0) {
                return this.get('currentItem.' + linkChunks[1]);
            }
            return linkChunks[0] + this.get('currentItem.' + linkChunks[1]);
        },
        onSaveClick: function (e) {
            var that = this,
                editFormData = this.get('editFormData'),
                itemData = this.get('itemData'),
                dataSource = <%= name %>.get('dataSource');

            /// edit properties
            /// start edit form data save
            /// end edit form data save

            function editModel(data) {
                /// start edit form data prepare
                /// end edit form data prepare
                dataSource.one('sync', function (e) {
                    /// start edit form data save success
                    /// end edit form data save success

                    app.mobileApp.navigate('#:back');
                });

                dataSource.one('error', function () {
                    dataSource.cancelChanges(itemData);
                });

                dataSource.sync();
                app.clearFormDomData('edit-item-view');
            };
            /// start edit form save
            /// end edit form save
            /// start edit form save handler
            editModel();
            /// end edit form save handler
        },
        onCancel: function () {
            /// start edit form cancel
            /// end edit form cancel
        }
    }));<% } %>

    if (typeof dataProvider.sbProviderReady === 'function') {
        dataProvider.sbProviderReady(function dl_sbProviderReady() {
            parent.set('<%= name %>', <%= name %>);
            var param = parent.get('<%= name %>_delayedFetch');
            if (typeof param !== 'undefined') {
                 parent.set('<%= name %>_delayedFetch', undefined);
                 fetchFilteredData(param);
            }
        });
    } else {
        parent.set('<%= name %>', <%= name %>);
    }

    parent.set('onShow', function (e) {
        var param = e.view.params.filter ? JSON.parse(e.view.params.filter) : null,
            isListmenu = <%= navigation === 'listmenu' %>,
            backbutton = e.view.element && e.view.element.find('header [data-role="navbar"] .backButtonWrapper'),
            dataSourceOptions = <%= name %>.get('_dataSourceOptions'),
            dataSource;

            if (param || isListmenu) {
                backbutton.show();
                backbutton.css('visibility', 'visible');
            } else {
                if (e.view.element.find('header [data-role="navbar"] [data-role="button"]').length) {
                    backbutton.hide();
                } else {
                    backbutton.css('visibility', 'hidden');
                }
            }

        <% if (isMapView) {%>
            app.mobileApp.pane.loader.show();
            <%= name %>.set('mapVisble', false);
            <%= name %>.set('itemDetailsVisible', false);
        <%}%>
        <% if (source === 'sitefinity') { %>
            dataSourceOptions.transport.CultureName = app.localization.currentCulture;
        <% } %>
        <% if (source === 'jsdo') { %>dataProvider.loadCatalogs().then(function _catalogsLoaded() {
            var jsdoOptions = <%= name %>.get('_jsdoOptions'),
            jsdo = new progress.data.JSDO(jsdoOptions);

            dataSourceOptions.transport.jsdo = jsdo;
            dataSource = new kendo.data.DataSource(dataSourceOptions);
            <%= name %>.set('dataSource', dataSource);
            <% if (isMapView) {%>dataSource.one('change', setupMapView);<%}%>
            $("#my-search-form").submit(function(e){
                e.preventDefault();
            });
            fetchFilteredData(param);
        });<% } else { %>
        dataSource = new kendo.data.DataSource(dataSourceOptions);
        <%= name %>.set('dataSource', dataSource);
        <% if (isMapView) {%>dataSource.one('change', setupMapView);<%}%>fetchFilteredData(param); <% } %>
    });
    <% if (isMapView){%>
    parent.set('onHide', function() {
        var dataSource = <%= name %>.get('dataSource');
        dataSource.unbind('change', setupMapView);
    });
    <%}%>
})(app.<%= parent %>);

// START_CUSTOM_CODE_<%= name %>
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

<% if (source === 'jsdo') { %>    // you can handle the beforeFill / afterFill events here. For example:
    /*
    app.<%= parent %>.<%= name %>.get('_jsdoOptions').events = {
        'beforeFill' : [ {
            scope : app.<%= parent %>.<%= name %>,
            fn : function (jsdo, success, request) {
                // beforeFill event handler statements ...
            }
        } ]
    };
    */
<% } %>// END_CUSTOM_CODE_<%= name %>
