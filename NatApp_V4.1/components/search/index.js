'use strict';

app.search = kendo.observable({
                                  onShow: function() {
                                  },
                                  afterShow: function() {
                                  }
                              });
app.localization.registerView('search');

// START_CUSTOM_CODE_search
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_search
(function(parent) {
    var dataProvider = app.data.backendServices,
    /// start global model properties
    /// end global model properties

        fetchFilteredData = function (paramFilter, searchFilter) {
            var newSearchFilter;

            if (searchFilter) {
                if (searchFilter.value.includes(" ")) {
                    var searchValuesArray = searchFilter.value.split(" ");
                    var newFiltersArray = [];

                    searchValuesArray.forEach(function (searchValue) {
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

            var model = parent.get('searchModel'),
                dataSource;

            if (model) {
                dataSource = model.get('dataSource');
            } else {
                parent.set('searchModel_delayedFetch', paramFilter || null);
                return;
            }

            if (paramFilter) {
                model.set('paramFilter', paramFilter);
            } else {
                model.set('paramFilter', undefined);
            }

            if (paramFilter && newSearchFilter) {
                dataSource.filter({
                                      logic: 'and',
                                      filters: [paramFilter, newSearchFilter]
                                  });
            } else if (paramFilter || newSearchFilter) {
                dataSource.filter(paramFilter || newSearchFilter);
            } else {
                dataSource.filter({});
            }
        },

        flattenLocationProperties = function(dataItem) {
            var propName, propValue,
                isLocation = function(value) {
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
        },
        dataSourceOptions = {
            type: 'everlive',
            transport: {
                typeName: 'Species',
                dataProvider: dataProvider
            },
            group: {
                field: 'Type'
            },
            change: function(e) {
                var data = this.data();
                for (var i = 0; i < data.length; i++) {
                    var dataItem = data[i];

                    /// start flattenLocation property
                    flattenLocationProperties(dataItem);
                    /// end flattenLocation property
                }
            },
            error: function(e) {
                if (e.xhr) {
                    var errorText = "";
                    try {
                        errorText = JSON.stringify(e.xhr);
                    } catch (jsonErr) {
                        errorText = e.xhr.responseText || e.xhr.statusText || 'An error has occurred!';
                    }
                    alert(errorText);
                }
            },
            schema: {
                model: {
                    fields: {
                        'Name': {
                            field: 'Name',
                            defaultValue: ''
                        },
                    }
                }
            },
            serverFiltering: true,
            serverSorting: true,
            sort: {
                field: 'Name',
                dir: 'asc'
            },
        },
    /// start data sources
    /// end data sources
        searchModel = kendo.observable({
                                           _dataSourceOptions: dataSourceOptions,
                                           searchChange: function(e) {
                                               var searchVal = e.target.value,
                                                   searchFilter;

                                               if (searchVal) {
                                                   searchFilter = {
                                                       field: 'Tags',
                                                       operator: 'contains',
                                                       value: searchVal
                                                   };
                                               }
                                               fetchFilteredData(searchModel.get('paramFilter'), searchFilter);
                                           },
                                           fixHierarchicalData: function(data) {
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
                                                       } else if ($.type(obj[name]) === 'object') {
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
                                                       } else {
                                                           if (srcObj.length > 0) {
                                                               for (j = 0; j < srcObj.length; j++) {
                                                                   fix(srcObj[j], ltObj[0]);
                                                               }
                                                           } else {
                                                               fix(srcObj, ltObj);
                                                           }
                                                       }
                                                   }
                                               })(result, layout);

                                               return result;
                                           },
                                           itemClick: function(e) {
                                               var dataItem = e.dataItem || searchModel.originalItem;

                                               app.mobileApp.navigate('#components/search/details.html?uid=' + dataItem.uid);
                                           },
                                           detailsShow: function(e) {
                                               var uid = e.view.params.uid,
                                                   dataSource = searchModel.get('dataSource'),
                                                   itemModel = dataSource.getByUid(uid);

                                               searchModel.setCurrentItemByUid(uid);
                                               /// start detail form show
                                               /// end detail form show
                                           },
                                           setCurrentItemByUid: function(uid) {
                                               var item = uid,
                                                   dataSource = searchModel.get('dataSource'),
                                                   itemModel = dataSource.getByUid(item);

                                               if (!itemModel.Type) {
                                                   itemModel.Type = String.fromCharCode(160);
                                               }

                                               /// start detail form initialization
                                               /// end detail form initialization

                                               searchModel.set('originalItem', itemModel);
                                               searchModel.set('currentItem',
                                                               searchModel.fixHierarchicalData(itemModel));

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

    if (typeof dataProvider.sbProviderReady === 'function') {
        dataProvider.sbProviderReady(function dl_sbProviderReady() {
            parent.set('searchModel', searchModel);
            var param = parent.get('searchModel_delayedFetch');
            if (typeof param !== 'undefined') {
                parent.set('searchModel_delayedFetch', undefined);
                fetchFilteredData(param);
            }
        });
    } else {
        parent.set('searchModel', searchModel);
    }

    parent.set('onShow', function(e) {
        var param = e.view.params.filter ? JSON.parse(e.view.params.filter) : null,
            isListmenu = false,
            backbutton = e.view.element && e.view.element.find('header [data-role="navbar"] .backButtonWrapper'),
            dataSourceOptions = searchModel.get('_dataSourceOptions'),
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

        dataSource = new kendo.data.DataSource(dataSourceOptions);
        searchModel.set('dataSource', dataSource);
        fetchFilteredData(param);
    });
})(app.search);
// START_CUSTOM_CODE_searchModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_searchModel