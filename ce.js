(function ($) {
    "use strict";

    var baseLayerURL = "http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer";
    if (window.ce === undefined) {
        window.ce = {};
    }
    var ce = window.ce;

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
                doReport();
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
                    doReport();
                });
            }(element));
        }


        function doReport() {
            var i, checked_elements = [];
            for (i=0; i<elements.length; ++i) {
                var element = elements[i];
                if ($('#checkbox-'+element).attr('checked')) {
                    checked_elements.push(element);
                }
            }
            var values = $('#timerange-slider').slider('values');
            $('#message')[0].innerHTML = 
                checked_elements.join(',') + '; ' + values[0] + '--' + values[1];
        }


/*
        $.ajax({url : 'http://dev.nemac.org/~mbp/ghcn-mirror/ghcnd-stations.csv',
                dataType: "text",
                success: function (data) {
                    console.log(data);
                },
                error: function (err) {
                    console.log('ERROR');
                    console.log(err);
                }});
*/

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

        var stationsLayer = new OpenLayers.Layer.Markers("stations",
                                                         {
                                                             projection  : new OpenLayers.Projection("EPSG:900913"), 
                                                             units       : "m"
                                                         }
                                                        );


        var size = new OpenLayers.Size(21,25);
        var offset = new OpenLayers.Pixel(-(size.w)/2, -size.h);
        var icon = new OpenLayers.Icon('http://www.openlayers.org/dev/img/marker.png', size, offset);

        for (var i=0; i<ce.stations.length; ++i) {
            var station = ce.stations[i];
            var coords = new OpenLayers.LonLat(station.longitude, station.latitude);
			coords = coords.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
            var marker = new OpenLayers.Marker(coords,icon.clone());
            (function () {
                var descr = station.description;
                marker.events.register('mouseover', marker, function(evt) {
                    //console.log(descr);
                });
            }());
            stationsLayer.addMarker(marker);
        }

        ce.map.addLayers([stationsLayer]);

        ce.map.zoomToExtent(maxExtentBounds, true);

    };

}(jQuery));
