(function ($) {
    "use strict";

//
// options: {
//    title  : STRING,
//    graphs : [ 
//      { title : STRING, muglFunc : FUNCTION }
//      { title : STRING, muglFunc : FUNCTION },
//      ...
//    ],
//    graphHeight : INTEGER,    
// }
// 
// Each element in the graphs object is a an object with the following properties:
//   * title    : STRING (a title for the graph, to be used on a button for turning the graph on)              
//   * muglFunc : a function that returns the MUGL for a graph
// 
// methods:
//   * displayGraph(i) - displays the graph at index in the original graphs list
//     

    var stationGraphDisplayTpl = (
        ''
            +  '<div class="station-graph-display">'
            +    '<div class="station-graph-display-header">'
            +      '<span class="station-graph-display-title">{{{title}}}</span>'
            +      '<span class="station-graph-display-close-button"><a href="#">X</a></span>'
            +    '</div>'
            +    '<div class="graphs"></div>'
            +  '</div>'
    );
    
    var multigraphTpl = (
        ''
            + '<div class="multigraph"></div>'
    );
            

    var methods = {

        displayGraph : function(i) {
            return this.each(function() {
                $(this).data('station_graph_display').graphs[i].muglFunc(
                    $(Mustache.to_html(multigraphTpl, {
                        //...
                    })).css({
                        width : $(this).width(),
                        height : $(this).data('station_graph_display').graphHeight
                    }).appendTo($(this).find('.graphs'))
                );
            });
        },

        init : function(options) {
            return this.each(function() {
                var $this = $(this),
                    data = $this.data('station_graph_display'),
                    settings = $.extend({
                        graphHeight: 150
                    }, options);
                if ( ! data ) {

                    // initialize our plugin data
                    $this.data('station_graph_display', {
                        afterClose  : settings.afterClose,
                        title       : settings.title,
                        graphs      : settings.graphs,
                        graphHeight : settings.graphHeight
                    });

                    // create the html for the graph display
                    $this.html(Mustache.to_html(stationGraphDisplayTpl, {
                        title       : settings.title
                    }));

                    var width = $(this).width();

                    // display any graphs that are initially open
                    $.each(settings.graphs, function(i,obj) {
                        if (obj.open) {
                        }
                    });

                    $this.find('.station-graph-display-close-button').click(function() {
                        var afterClose;
                        if ($this.data('station_graph_display').afterClose !== undefined) {
                            afterClose = $this.data('station_graph_display').afterClose();
                        }
                        $this.remove();
                        if (afterClose !== undefined) {
                            afterClose();
                        }
                    });

                }

                return this;
            });
        }

    };

    $.fn.station_graph_display = function( method ) {
        if ( methods[method] ) {
            return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.station_graph_display' );
            return null;
        }    
    };
    
}(jQuery));
