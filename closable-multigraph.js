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

                    $this.html(Mustache.to_html(closableMultigraphTpl, {
                        title       : settings.title
                    }));

                    window.multigraph.jQuery(this).find('.multigraph').multigraph(settings);

                    $this.find('.closable-multigraph-close-button').click(function() {
                        $this.remove();
                    });

                }

                return this;
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
    
}(jQuery));
