(function ($) {
    "use strict";

    var baseLayerURL = "http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer";
    if (window.ce === undefined) {
        window.ce = {};
    }
    console.log(window.ce);
    var ce = window.ce;

    ce.init = function() {
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
            console.log(station.longitude + ', ' + station.latitude);
            var coords = new OpenLayers.LonLat(station.longitude, station.latitude);
			coords = coords.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
            var marker = new OpenLayers.Marker(coords,icon.clone());
            (function () {
                var descr = station.description;
                marker.events.register('mouseover', marker, function(evt) {
                    console.log(descr);
                });
            }());
            stationsLayer.addMarker(marker);
        }

        ce.map.addLayers([stationsLayer]);

        ce.map.zoomToExtent(maxExtentBounds, true);

    };

}(jQuery));
