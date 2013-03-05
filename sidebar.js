(function ($) {
    "use strict";

    var methods = {

        init : function(options) {
            return this.each(function() {
                var $this = $(this),
                    data = $this.data('sidebar'),
                    settings = $.extend({
                    }, options);
                if ( ! data ) {

                    $this.data('sidebar', {
                        //...
                    });

                    $this.addClass('sidebar');

                    var mouseLast;
                    var mouseIsDown;
                    var origWidth;
                    var origX;

                    //console.log($this.parent().width());

                    $('<div class="sidebar-handle"></div>').appendTo($this).css({
                        cursor : 'col-resize'
                    }).mousedown(function (event) {
                        mouseLast = { x : event.pageX, y : event.pageY };
                        origX = event.pageX;
                        origWidth = $this.width();
                        mouseIsDown = true;
                    }).mousemove(function (event) {
                        if (mouseIsDown) {
                            var dx = event.pageX  - mouseLast.x;
                            var dy = event.pageY  - mouseLast.y;
                            $this.css({width : origWidth + (origX - event.pageX)});
                            //console.log('dx = ' + dx);
                            mouseLast = { x : event.pageX, y : event.pageY };
                        }
                    }).mouseup(function (event) {
                        mouseIsDown = false;
                    });
                    /*
                    .mouseenter(function (event) {
                        mouseIsDown = false;
                    }).mouseleave(function (event) {
                        mouseIsDown = false;
                    });
                     */
                    
                    
                    if (settings.closer !== undefined) {
                        $(settings.closer).click(function() {
                            var width = $this.width();
                            $this.animate({ right: '-='+width+'px' }, 400, function() {
                                $this.css({'display' : 'none'});
                            });
                        });
                    }


                }

                return this;
            });
        }
    };

    $.fn.sidebar = function( method ) {
        if ( methods[method] ) {
            return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.sidebar' );
            return null;
        }    
    };
    
}(jQuery));
