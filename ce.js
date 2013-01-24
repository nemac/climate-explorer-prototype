(function ($) {
    "use strict";

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
    var stationMarkerIcon = new OpenLayers.Icon('http://www.openlayers.org/dev/img/marker.png', size, offset);

    ce.init = function() {



 // Variables
    var objMain = $('#main');
 
    // Show sidebar
    function showSidebar(){
        objMain.addClass('use-sidebar');
        //$.cookie('sidebar-pref2', 'use-sidebar', { expires: 30 });
    }
 
    // Hide sidebar
    function hideSidebar(){
        objMain.removeClass('use-sidebar');
        //$.cookie('sidebar-pref2', null, { expires: 30 });
    }
 
    // Sidebar separator
    var objSeparator = $('#separator');
 
    objSeparator.click(function(e){
        e.preventDefault();
        if ( objMain.hasClass('use-sidebar') ){
            hideSidebar();
        }
        else {
            showSidebar();
        }
        if (ce.map !== undefined) {
            ce.map.updateSize();
        }
    }).css('height', objSeparator.parent().outerHeight() + 'px');
 
    // Load preference
/*
    if ( $.cookie('sidebar-pref2') == null ){
        objMain.removeClass('use-sidebar');
    }
*/

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
            values : [1950, 2012],
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

        var elements = ['SNOW',
                        'PRCP',
                        'TMAX',
                        'TMIN'];
        var i;
        for (i=0; i<elements.length; ++i) {
            var element = elements[i];
            $('#element-checkboxes').append(
                $(Mustache.render(''
                                  + '<div class="element-checkbox">'
                                  +   '<input type="checkbox" id="checkbox-{{{id}}}"></input>'
                                  +   '<label for="{{{id}}}">{{{name}}}</label>'
                                  + '</div>',
                                  {
                                      id : element,
                                      name : element
                                  }))
            );
            (function(element) {
                $('#checkbox-'+element).click(function() {
                    updateStations();
                });
            }(element));
        }

        function updateStations() {
            var i, checked_elements = [];
            for (i=0; i<elements.length; ++i) {
                var element = elements[i];
                if ($('#checkbox-'+element).attr('checked')) {
                    checked_elements.push(element);
                }
            }
            var values = $('#timerange-slider').slider('values');

            var minyear = values[0];
            var maxyear = values[1];

            var inventoryPromises = [];
            for (i=0; i<checked_elements.length; ++i) {
                inventoryPromises.push(insureInventory(checked_elements[i]));
            }

            $.when.apply(this, inventoryPromises).then(function() {
                var stationsToShow = [], i, id, station, j, element, station_ok, coverage_threshold;
                if (checked_elements.length > 0) {
                    coverage_threshold = $('#coverage-slider').slider('value') / 100.0;
                    for (i=0; i<stationIds.length; ++i) {
                        id = stationIds[i];
                        station = stations[id];
                        station_ok = true;
                        for (j=0; j<checked_elements.length && station_ok; ++j) {
                            element = checked_elements[j];
                            station_ok = ((inventory[element][id] !== undefined)
                                          && (inventory[element][id].min <= minyear)
                                          && (inventory[element][id].max >= maxyear)
                                          && (inventory[element][id].cov >= coverage_threshold));
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
                                        elements : checked_elements.join(','),
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

        function insureInventory(element) {
            var deferred;
            if (inventory[element]) {
                deferred = $.Deferred();
                deferred.resolve();
                return deferred.promise();
            } else {
                return $.ajax({url : 'inventory/' + element + '.inv',
                               dataType : "text",
                               success: function (data) {
                                   loadInventory(element, data);
                               },
                               error: function (err) {
                                   console.log('ERROR');
                                   console.log(err);
                               }});
            }
        }

        function loadInventory(element, data) {
            var lines = data.split("\n"),
                i,
                columns;
            inventory[element] = {};
            for (i=0; i<lines.length; ++i) {
                if (/,/.test(lines[i])) { // skip line unless it contains a comma
                    columns = lines[i].split(/\s*,\s*/);
                    //columns[0] = id
                    //columns[1] = mindate
                    //columns[2] = maxdate
                    //columns[3] = coverage
                    inventory[element][columns[0]] = {
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


        /*
        layer.addListener("transparency", function (e) {
            $html.find('.transparency-slider').slider("value", e.value);
        });
        $html.find('input.transparency-text').change(function() {
            var newValueFloat = parseFloat($(this).val());
            if (isNaN(newValueFloat) || newValueFloat < 0 || newValueFloat > 100) {
                $(this).val(layer.transparency);
                return;
            }
            layer.setTransparency($(this).val());
        });
        layer.addListener("transparency", function (e) {
            $html.find('input.transparency-text').val(e.value);
        });
        */

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
        console.log('showing ' + stations.length + ' stations');
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
                marker.events.register('click', marker, function(evt) {
                    $('#message')[0].innerHTML = 'You clicked on: ' + id;
                    $.ajax({
                        url : 'http://dev.nemac.org/~mbp/ghcn-mirror/datfiles/TMAX/' + id + '.dat',
                        dataType: "text",
                        success:  function (data) {
                            displayGraph(data, markerCoords, name, id, minyear, maxyear);
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            alert(textStatus);
                        }
                    });
                    //console.log(name);
                });
            }());
            stationsLayer.addMarker(marker);
        }
        ce.map.addLayers([stationsLayer]);
    }

    function displayGraph(data, coords, name, id, minyear, maxyear) {
        $.ajax({ url : 'mugl.tpl.xml',
                 dataType : "text",
                 success : function (mugl_tpl) {
                     var muglString = Mustache.render(mugl_tpl, {
                         mindate : minyear,
                         maxdate : maxyear,
                         values  : inv_to_values(data)
                     });
                     ce.map.addPopup(new OpenLayers.Popup.FramedCloud(
                                         "ceMultigraphPopup", 
                                         coords,
                                         null,
                                         '<div id="ceMultigraphMessage">Loading...</div><div id="ceMultigraph" style="width: 600px; height: 300px;"></div>',
                                         null,
                                         true));
                     var promise = window.multigraph.jQuery('#ceMultigraph').multigraph({
                         //NOTE: coords.lon and coords.lat on the next line are really x,y coords in EPSG:900913, not lon/lat:
                         'muglString'   : muglString
                     });
                     window.multigraph.jQuery('#ceMultigraph').multigraph('done', function() {
                         $('#ceMultigraphMessage').empty();
                         $('#ceMultigraphMessage').text(name);
                     });
                 },
                 error: function(jqXHR, textStatus, errorThrown) {
                     alert(textStatus);
                 }
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
