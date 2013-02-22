(function ($) {
    "use strict";

    var closableMultigraphTpl =
            (
                ''
                    +  '<div class="closable-multigraph">'
                    +    '<div class="closable-multigraph-header">'
                    +      '<span class="closable-multigraph-title">{{{title}}}</span>'
                    +      '<span class="closable-multigraph-close-button"><a href="#">X</a></span>'
                    +    '</div>'
                    +    '<div class="multigraph"></div>'
                    +  '</div>'
            );

    var methods = {

        init : function(options) {
            return this.each(function() {
                var $this = $(this),
                    data = $this.data('closable_multigraph'),
                    settings = $.extend({
                    }, options);
                if ( ! data ) {

                    $this.data('closable_multigraph', {
                        afterClose : settings.afterClose
                    });

                    $this.html(Mustache.to_html(closableMultigraphTpl, {
                        title       : settings.title
                    }));

                    var width = $(this).width();
                    var height = $(this).height() - 25 - 1;

                    $this.find('.multigraph').css({
                        width : width,
                        height : height
                    });

                    if (settings['mugl'] !== undefined || settings['muglString'] !== undefined) {
                        $this.find('.multigraph').multigraph(settings);
                    } else {
                        $(this).find('.multigraph').html('Loading...');
                    }

                    $this.find('.closable-multigraph-close-button').click(function() {
                        var afterClose;
                        if ($this.data('closable_multigraph').afterClose !== undefined) {
                            afterClose = $this.data('closable_multigraph').afterClose();
                        }
                        $this.remove();
                        if (afterClose !== undefined) {
                            afterClose();
                        }
                    });

                }

                return this;
            });
        },

        multigraph : function(options) {
            return this.each(function() {
                $(this).find('.multigraph').empty();
                $(this).find('.multigraph').multigraph(options);
            });
        }
    };

    $.fn.closable_multigraph = function( method ) {
        if ( methods[method] ) {
            return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.closable_multigraph' );
            return null;
        }    
    };
    
}(window.multigraph.jQuery));
