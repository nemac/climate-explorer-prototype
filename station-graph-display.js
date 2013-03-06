(function ($) {
    "use strict";

//
// options: {
//    title  : STRING,
//    graphs : [ 
//      { title : STRING, muglPromise : FUNCTION }
//      { title : STRING, muglPromise : FUNCTION },
//      ...
//    ],
//    graphHeight : INTEGER,    
// }
// 
// Each element in the graphs object is a an object with the following properties:
//   * title        : STRING (a title for the graph, to be used on a button for turning the graph on)
//   * muglPromise  : FUNCTION (a function that returns a promise that, when it resolves, will call
//                    its `done` function with a single string argument which is the mugl for a graph)
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
            +    '<div class="control">'
            +      '<span class="label">Also available:</span>'
            +      '<span class="buttons"></span>'
            +    '</div>'
            +  '</div>'
    );
    
    var multigraphTpl = (
        ''
            + '<div class="multigraph">'
            +   '<div class="loading-message">'
            +     '<span class="spinner">'
            +       '<img src="icons/ajax-loader.gif">'
            +     '</span>'
            +     '<span class="title">Loading {{{title}}}</span>'
            +   '</div>'
            + '</div>'
    );

    var multigraphCloseButtonTpl = (
        ''
            + '<div class="close-button">'
            +   '<a href="#">x</a>'
            + '</div>'
    );

    var graphLinkTpl = (
        ''
            + '<a href="#">{{{title}}}</a>'
    );
            

    var methods = {

        displayGraph : function(i) {
            return this.each(function() {
                var $this = $(this);
                var graph = $this.data('station_graph_display').graphs[i];
                var $graphDiv = $(Mustache.to_html(multigraphTpl, {
                    title : graph.title
                })).css({
                    width : $this.width(),
                    height : $this.data('station_graph_display').graphHeight
                }).appendTo($this.find('.graphs'));
                
                graph.muglPromise().done(function(muglString) {
                    $graphDiv.empty();
                    $graphDiv.multigraph({
                        muglString : muglString
                    });
                    var $closeButton = $(Mustache.render(multigraphCloseButtonTpl, {
                    })).click(function(e) {
                        $graphDiv.remove();
                        e.preventDefault();
                        graph.onDisplay = false;
                        methods._updateDisplayLinks.apply($this);
                    });
                    $graphDiv.append($closeButton);
                });
                graph.onDisplay = true;
                methods._updateDisplayLinks.apply($this);
            });
        },

        _updateDisplayLinks : function() {
            return this.each(function() {
                var $this = $(this);
                var links = [];
                $.each($this.data('station_graph_display').graphs, function(i,graph) {
                    if (! graph.onDisplay) {
                        var $link = $(Mustache.render(graphLinkTpl, {
                            title : graph.title
                        })).click(function (e) {
                            methods.displayGraph.call($this, i);
                            e.preventDefault();
                        });
                        links.push($link);
                    }
                });
                var $buttons = $this.find('.control .buttons');
                $buttons.empty();
                if (links.length > 0) {
                    $this.find('.control').css({display: 'block'});
                    $.each(links, function(i,link) {
                        if (i > 0) {
                            $buttons.append($('<span>,</span>'));
                        }
                        $buttons.append(link);
                    });
                } else {
                    $this.find('.control').css({display: 'none'});
                }
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
                        afterClose   : settings.afterClose,
                        title        : settings.title,
                        graphs       : settings.graphs,
                        graphHeight  : settings.graphHeight
                    });

                    // create the html for the graph display
                    $this.html(Mustache.to_html(stationGraphDisplayTpl, {
                        title       : settings.title
                    }));

                    $.each(settings.graphs, function(i,graph) {
                        graph.onDisplay = false;
                    });
                    methods._updateDisplayLinks.apply($this);

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
