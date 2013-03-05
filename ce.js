(function ($) {
    "use strict";

    var left_sidebar_width = 300;
    var right_sidebar_width = 600;
    var closable_multigraph_height = 250;

    var baseLayerURL = "http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer";
    if (window.ce === undefined) {
        window.ce = {};
    }
    var ce = window.ce;

    var stations;
    var stationIds;
    var stationsLayer;
    var inventory = {};

    var size = new OpenLayers.Size(21,25);
    var offset = new OpenLayers.Pixel(-(size.w)/2, -size.h);
    var stationMarkerIcon = new OpenLayers.Icon('icons/marker.png', size, offset);

    ce.elements = [
        { title : 'Temperature Max/Min',         id : 'TEMP',            ghcn_element_ids : ['TMAX', 'TMIN', 'NORMAL_TMAX', 'NORMAL_TMIN'] },
        { title : 'YTD Precipitation',           id : 'YTD_PRCP',        ghcn_element_ids : ['YTD_PRCP', 'NORMAL_YTD_PRCP'] },
        { title : 'Snow',                        id : 'SNOW',            ghcn_element_ids : ['SNOW'] }
/*
        { title : 'Temperature Max/Min',         id : 'TEMP',            ghcn_element_ids : ['TMAX', 'TMIN'] },
        { title : 'Normal Temperature Max/Min',  id : 'NORMAL_TEMP',     ghcn_element_ids : ['NORMAL_TMAX', 'NORMAL_TMIN'] },
        { title : 'YTD Precipitation',           id : 'YTD_PRCP',        ghcn_element_ids : ['YTD_PRCP'] },
        { title : 'Normal Precipitation',        id : 'NORMAL_YTD_PRCP', ghcn_element_ids : ['NORMAL_YTD_PRCP'] },
        { title : 'Precipitation',               id : 'PRCP',            ghcn_element_ids : ['PRCP'] },
        { title : 'Snow',                        id : 'SNOW',            ghcn_element_ids : ['SNOW'] }
*/
    ];

    ce.checked_elements = [];
    ce.checked_ghcn_element_ids = [];

    var DataFetcher = function(station_id, ghcn_element_ids) {
        //
        // Fetch all the data for a given station and a given list of ghcn elements.  Provides a `done()` method
        // that can be passed a callback function that will be called when all the requested data is available.
        // Data will be available in the `data` property, which is an object whose keys are the requested element ids.
        // 
        // For example:
        // 
        //     var fetcher = new DataFetcher('USC00234323', ['TMAX','TMIN','PRCP'])
        //     fetcher.done(function() {
        //        // fetcher.data['TMAX'], fetcher.data['TMIN'], fetcher.data['PRCP']
        //        // are available here
        //     });
        //
        var that = this;
        
        that.station_id       = station_id;
        that.ghcn_element_ids = [];
        that.data             = {};
        that.deferred         = $.Deferred();
        that.promise          = that.deferred.promise();
        that.ajaxPromises     = [];

        $.each(ghcn_element_ids, function (i, ghcn_element_id) {
            that.ajaxPromises.push(
                $.ajax({
                    url : 'http://dev.nemac.org/~mbp/ghcn-mirror/datfiles/'+ghcn_element_id+'/' + station_id + '.dat',
                    dataType: "text",
                    success:  function (data) {
                        that.data[ghcn_element_id] = data;
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        alert(textStatus);
                    }
                })
            );
        });

        $.when.apply(that, that.ajaxPromises).then(function() {
            that.deferred.resolve();
        });

        that.done = function (callback) {
            that.promise.done(callback);
        };

    };
    ce.DataFetcher = DataFetcher;

    var is_right_sidebar_open = true;

    function right_sidebar_close(immediate) {
        if (is_right_sidebar_open) {
            if (immediate === true) {
                $('#right-sidebar').css({
                    right     : '-'+right_sidebar_width+'px',
                    'display' : 'none'
                });
            } else {
                $('#right-sidebar').animate({ right: '-='+right_sidebar_width+'px' }, 400, function() {
                    $('#right-sidebar').css({'display' : 'none'});
                });
            }
            is_right_sidebar_open = false;
        }
    }

    function right_sidebar_open() {
        if (!is_right_sidebar_open) {
            $('#right-sidebar').css({'display' : 'block'});
            $('#right-sidebar').animate({ right: '+='+right_sidebar_width+'px' });
            is_right_sidebar_open = true;
        }
    }

    function right_sidebar_opener_show(visible) {
        if (visible) {
            $('.right-sidebar-opener').css({visibility: 'visible'});
        } else {
            $('.right-sidebar-opener').css({visibility: 'hidden'});
        }
    }

    var num_graphs = 0;

    ce.init = function() {

        $('#left-sidebar').css({width: left_sidebar_width+'px'});
        $('#right-sidebar').css({width: right_sidebar_width+'px'});

        $('.left-sidebar-closer').click(function() {
            $('#left-sidebar').animate({ left: '-='+left_sidebar_width+'px' }, 400, function() {
                $('#left-sidebar').css({'display' : 'none'});
            });
        });

        $('.left-sidebar-opener').click(function() {
            $('#left-sidebar').css({'display' : 'block'});
            $('#left-sidebar').animate({ left: '+='+left_sidebar_width+'px' });
        });

        $('.right-sidebar-closer').click(function() {
            right_sidebar_close();
        });

        $('.right-sidebar-opener').click(function() {
            right_sidebar_open();
        });

        right_sidebar_close(true);

        $('.right-sidebar').resizable({
            handles: 'w'
        });

        $('#coverage-slider').slider({
            min    : 0,
            max    : 100,
            step   : 1,
            value  : 90,
            slide  : function(event, ui) {
                $('#coverage-text')[0].innerHTML = ui.value;
            },
            change  : function(event, ui) {
                updateStations();
            }
        });
        $('#coverage-text')[0].innerHTML = $('#coverage-slider').slider('value');

        $('#timerange-slider').slider({
            min    : 1750,
            max    : 2013,
            step   : 1,
            values : [1900, 2012],
            slide  : function(event, ui) {
                $('#timerange-min-text')[0].innerHTML = ui.values[0];
                $('#timerange-max-text')[0].innerHTML = ui.values[1];
            },
            change  : function(event, ui) {
                updateStations();
            }
        });
        var values = $('#timerange-slider').slider('values');
        $('#timerange-min-text')[0].innerHTML = values[0];
        $('#timerange-max-text')[0].innerHTML = values[1];

        var i;
        for (i=0; i<ce.elements.length; ++i) {
            var element = ce.elements[i];
            $('#element-checkboxes').append(
                $(Mustache.render(''
                                  + '<div class="element-checkbox">'
                                  +   '<input type="checkbox" id="checkbox-{{{id}}}"></input>'
                                  +   '<label for="{{{id}}}">{{{title}}}</label>'
                                  + '</div>',
                                  {
                                      id : element.id,
                                      title : element.title
                                  }))
            );
            (function(element) {
                $('#checkbox-'+element.id).click(function() {
                    updateStations();
                });
            }(element));
        }

        function updateStations() {
            ce.checked_elements = [];
            ce.checked_ghcn_element_ids = [];
            var i, j;
            $.each(ce.elements, function (i,element) {
                if ($('#checkbox-'+element.id).attr('checked')) {
                    element.checked = true;
                    ce.checked_elements.push(element);
                    $.each(element.ghcn_element_ids, function(k,id) {
                        ce.checked_ghcn_element_ids.push(id);
                    });
                } else {
                    element.checked = false;
                }
            });
            var values = $('#timerange-slider').slider('values');

            var minyear = values[0];
            var maxyear = values[1];

            var inventoryPromises = [];
            $.each(ce.checked_elements, function (i) {
                for (j=0; j<ce.checked_elements[i].ghcn_element_ids.length; ++j) {
                    inventoryPromises.push(insureInventory(ce.checked_elements[i].ghcn_element_ids[j]));
                }
            });

            $.when.apply(this, inventoryPromises).then(function() {
                var stationsToShow = [], i, id, station, j, k, element, station_ok, coverage_threshold,
                    ghcn_element_id;
                if (ce.checked_elements.length > 0) {
                    coverage_threshold = $('#coverage-slider').slider('value') / 100.0;
                    for (i=0; i<stationIds.length; ++i) {
                        id = stationIds[i];
                        station = stations[id];
                        station_ok = true;
                        for (j=0; j<ce.checked_elements.length && station_ok; ++j) {
                            for (k=0; k<ce.checked_elements[j].ghcn_element_ids.length && station_ok; ++k) {
                                ghcn_element_id = ce.checked_elements[j].ghcn_element_ids[k];
                                station_ok = ((inventory[ghcn_element_id][id] !== undefined)
                                              && (inventory[ghcn_element_id][id].min <= minyear)
                                              && (inventory[ghcn_element_id][id].max >= maxyear)
                                              && (inventory[ghcn_element_id][id].cov >= coverage_threshold));
                            }
                        }
                        if (station_ok) {
                            stationsToShow.push(station);
                        }
                    }
                }
                showStations(stationsToShow, minyear, maxyear);
                if (stationsToShow.length > 0) {
                $('#station-choice-message')[0].innerHTML =
                    Mustache.render('Showing {{{n}}} stations with {{{elements}}} from {{{minyear}}} to {{{maxyear}}}.',
                                    {
                                        n        : stationsToShow.length,
                                        elements : $.map(ce.checked_elements, function (e) {
                                                      return e.ghcn_element_ids.join(', ');
                                                   }).join(', '),
                                        minyear  : minyear,
                                        maxyear  : maxyear
                                        });
                } else {
                    $('#station-choice-message')[0].innerHTML = "No stations meet the selected criteria.";
                }
            });
        }

        $.ajax({url : 'ghcnd-stations.csv',
                //'small.csv',
                dataType: "text",
                success: function (data) {
                    parseStations(data);
                },
                error: function (err) {
                    console.log('ERROR');
                    console.log(err);
                }});

        function insureInventory(ghcn_element_id) {
            var deferred;
            if (inventory[ghcn_element_id]) {
                deferred = $.Deferred();
                deferred.resolve();
                return deferred.promise();
            } else {
                return $.ajax({url : 'inventory/' + ghcn_element_id + '.inv',
                               dataType : "text",
                               success: function (data) {
                                   loadInventory(ghcn_element_id, data);
                               },
                               error: function (err) {
                                   console.log('ERROR');
                                   console.log(err);
                               }});
            }
        }

        function loadInventory(ghcn_element_id, data) {
            var lines = data.split("\n"),
                i,
                columns;
            inventory[ghcn_element_id] = {};
            for (i=0; i<lines.length; ++i) {
                if (/,/.test(lines[i])) { // skip line unless it contains a comma
                    columns = lines[i].split(/\s*,\s*/);
                    //columns[0] = id
                    //columns[1] = mindate
                    //columns[2] = maxdate
                    //columns[3] = coverage
                    inventory[ghcn_element_id][columns[0]] = {
                        min : columns[1],
                        max : columns[2],
                        cov : parseFloat(columns[3])
                    };
                }
            }
        }
        
        
        function parseStations(data) {
            var lines = data.split("\n"),
                i,
                columns;
            stations = {};
            stationIds = [];
            for (i=0; i<lines.length; ++i) {
                if (/\|/.test(lines[i])) { // skip line unless it contains a |
                    columns = lines[i].split(/\s*\|\s*/);
                    stations[columns[0]] = {
                        id   : columns[0],
                        lat  : columns[1],
                        lon  : columns[2],
                        elev : columns[3],
                        //state : columns[4],
                        name : columns[5]
                    };
                    stationIds.push(columns[0]);
                }
            }
        }

            $.ajax({
                url: baseLayerURL + '?f=json&pretty=true',
                dataType: "jsonp",
                success:  function (baseLayerInfo) {
                    initOpenLayers(baseLayerInfo);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert(textStatus);
                }
            });
    };

        function inv_to_values(data) {
            var lines = data.split("\n"),
                i, j,
                columns,
                rows = [];
            for (i=0; i<lines.length; ++i) {
                if (/,/.test(lines[i])) { // skip line unless it contains a comma
                    columns = lines[i].split(/\s*,\s*/);
                    var yyyymm = columns[0];
                    for (j=1; j<columns.length; ++j) {
                        var val = columns[j];
                        if (val === 'M') { val = "-9999"; }
                        rows.push(sprintf("%s%02d,%s", yyyymm, j, val));
                    }
                }
            }
            return rows.join("\n");
        }



    function showStations(stations, minyear, maxyear) {
        if (stationsLayer !== undefined) {
            ce.map.removeLayer(stationsLayer);
        }
        stationsLayer = new OpenLayers.Layer.Markers("stations",
                                                     {
                                                         projection  : new OpenLayers.Projection("EPSG:900913"), 
                                                         units       : "m"
                                                     }
                                                    );
        for (var i=0; i<stations.length; ++i) {
            var station = stations[i];
            var coords = new OpenLayers.LonLat(station.lon, station.lat);
            coords = coords.transform(new OpenLayers.Projection("EPSG:4326"),
                                      new OpenLayers.Projection("EPSG:900913"));
            var marker = new OpenLayers.Marker(coords,stationMarkerIcon.clone());
            (function () {
                var name = station.name;
                var id   = station.id;
                var markerCoords = coords;
                marker.events.register('mouseover', marker, function(evt) {
                    //console.log(name);
                });
                var clickHandler = function(evt) {
                    $('#message')[0].innerHTML = 'You clicked on: ' + id;
                    //displayGraph(markerCoords, name, id, minyear, maxyear);
                    displayStation(markerCoords, name, id, minyear, maxyear);
                };
                marker.events.register('click', marker, clickHandler);
                marker.events.register('touchstart', marker, clickHandler);
            }());
            stationsLayer.addMarker(marker);
        }
        ce.map.addLayers([stationsLayer]);
    }

    function displayStation(coords, name, stationid, minyear, maxyear) {

        var graphs = [];
        var checked_elements = [];

        right_sidebar_open();
        right_sidebar_opener_show(true);

        $.each(ce.elements, function (i,element) {
            if (element.checked) {
                checked_elements.push(element);
            }
        });

        $.each(ce.elements, function (i,element) {
            var ghcn_element_ids = element.ghcn_element_ids;
            graphs.push({
                title : element.title,
                muglFunc : function (target) {
                    var dataFetcher = new ce.DataFetcher(stationid, ghcn_element_ids);
                    dataFetcher.done(function() {
                        graph.all_tpl_promises.done(function() {
                            var muglString = graph.buildMugl(stationid, parseInt(maxyear)-1, maxyear, [ element ], dataFetcher.data);
                            window.multigraph.jQuery(target).multigraph({
                                muglString : muglString
                            });
                        });
                    });
                }
            });
        });


        var $station_graph_display = window.multigraph.jQuery('<div></div>').station_graph_display({
            title  : name,
            graphs : graphs
        }).appendTo($('.multigraph-area'));
        $.each(ce.elements, function (i,element) {
            if (element.checked) {
                $station_graph_display.station_graph_display('displayGraph', i);
            }
        });
        
    }
    
    function displayGraph(coords, name, stationid, minyear, maxyear) {
        var messageId          = "multigraph-message-" + stationid;
        var multigraphDialogId = "multigraph-dialog-" + stationid;
        var multigraphId       = "multigraph-" + stationid;

        num_graphs = num_graphs + 1;

        right_sidebar_open();
        right_sidebar_opener_show(true);

        var closable_multigraph = window.multigraph.jQuery('<div></div>').css({
            width: right_sidebar_width+'px',
            height: closable_multigraph_height+'px'
        }).closable_multigraph({
            title : name,
            afterClose : function () {
                num_graphs = num_graphs - 1;
                if (num_graphs <= 0) {
                    right_sidebar_close();
                    right_sidebar_opener_show(false);
                }
            }
        }).appendTo(window.multigraph.jQuery('.multigraph-area'));

        var dataFetcher = new ce.DataFetcher(stationid, ce.checked_ghcn_element_ids);
        dataFetcher.done(function() {
            graph.all_tpl_promises.done(function() {
                var muglString = graph.buildMugl(stationid, parseInt(maxyear)-1, maxyear, ce.checked_elements, dataFetcher.data);

                closable_multigraph.closable_multigraph('multigraph', {
                    muglString : muglString
                });

            });
        });

    }

    var initOpenLayers = function(baseLayerInfo) {

        var layer = new OpenLayers.Layer.ArcGISCache("AGSCache", baseLayerURL, {
            layerInfo: baseLayerInfo
        });
        
        var maxExtentBounds = new OpenLayers.Bounds(-15000000, 2000000, -6000000, 7000000);

        ce.map = new OpenLayers.Map('map', {
            maxExtent:         maxExtentBounds,
            units:             'm',
            resolutions:       layer.resolutions,
            numZoomLevels:     layer.numZoomLevels,
            tileSize:          layer.tileSize,
            controls: [
                new OpenLayers.Control.Navigation({
                    dragPanOptions: {
                        enableKinetic: true
                    }
                }),
                new OpenLayers.Control.Attribution()
            ],
            zoom: 1,
            projection: new OpenLayers.Projection("EPSG:900913")
        });

        ce.map.addLayers([layer]);
        ce.map.setLayerIndex(layer, 0);

        ce.map.zoomToExtent(maxExtentBounds, true);

    };

}(jQuery));
