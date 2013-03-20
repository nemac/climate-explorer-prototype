(function ($) {
    "use strict";

    var ce = window.ce;
    var graph = {};

    var tpls = [    
        { key : 'data-temp',                   url : 'mugl/data-temp.tpl.xml' },
        { key : 'data-normal-temp',            url : 'mugl/data-normal-temp.tpl.xml' },
        { key : 'data-prcp',                   url : 'mugl/data-prcp.tpl.xml' },
        { key : 'data-ytd-prcp',               url : 'mugl/data-ytd-prcp.tpl.xml' },
        { key : 'data-normal-ytd-prcp',        url : 'mugl/data-normal-ytd-prcp.tpl.xml' },
        { key : 'data-snow',                   url : 'mugl/data-snow.tpl.xml' },
        { key : 'data-drought-pdsi',           url : 'mugl/data-drought-pdsi.tpl.xml' },
        { key : 'data-ndvi',                   url : 'mugl/data-ndvi.tpl.xml' },
        { key : 'mugl',                        url : 'mugl/mugl.tpl.xml' },
        { key : 'plot-temp',                   url : 'mugl/plot-temp.tpl.xml' },
        { key : 'plot-normal-temp',            url : 'mugl/plot-normal-temp.tpl.xml' },
        { key : 'plot-prcp',                   url : 'mugl/plot-prcp.tpl.xml' },
        { key : 'plot-ytd-prcp',               url : 'mugl/plot-ytd-prcp.tpl.xml' },
        { key : 'plot-normal-ytd-prcp',        url : 'mugl/plot-normal-ytd-prcp.tpl.xml' },
        { key : 'plot-snow',                   url : 'mugl/plot-snow.tpl.xml' },
        { key : 'plot-drought-pdsi',           url : 'mugl/plot-drought-pdsi.tpl.xml' },
        { key : 'plot-ndvi',                   url : 'mugl/plot-ndvi.tpl.xml' },
        { key : 'vertical-axis-prcpmm',        url : 'mugl/vertical-axis-prcpmm.tpl.xml' },
        { key : 'vertical-axis-ytd-prcpmm',    url : 'mugl/vertical-axis-ytd-prcpmm.tpl.xml' },
        { key : 'vertical-axis-snowmm',        url : 'mugl/vertical-axis-snowmm.tpl.xml' },
        { key : 'vertical-axis-tempc',         url : 'mugl/vertical-axis-tempc.tpl.xml' },
        { key : 'vertical-axis-pdsi',          url : 'mugl/vertical-axis-pdsi.tpl.xml' },
        { key : 'vertical-axis-ndvi',          url : 'mugl/vertical-axis-ndvi.tpl.xml' }
    ];

    var tpl_promises = [];
    graph.tpl = {};
    $.each(tpls, function(i, tpl) {
        tpl_promises.push($.ajax({
            url : tpl.url,
            dataType : "text",
            success : function (data) {
                graph.tpl[tpl.key] = data;
            },
            error : function (e) {
                alert(e);
            }
        }));
    });

    var deferred = $.Deferred();
    graph.all_tpl_promises = deferred.promise();
    $.when.apply(this, tpl_promises).then(function() {
        deferred.resolve();
    });

    graph.init = function() {
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
                    //updateStations();
                });
            }(element));
        }

        $('#submit').click(function(e) {
            e.preventDefault();

            var stationid = $('#stationid').val();
            var minyear   = $('#minyear').val();
            var maxyear   = $('#maxyear').val();

            ce.checked_elements = [];
            ce.checked_ghcn_element_ids = [];
            var i, j;
            for (i=0; i<ce.elements.length; ++i) {
                var element = ce.elements[i];
                if ($('#checkbox-'+element.id).attr('checked')) {
                    ce.checked_elements.push(element);
                    $.each(element.ghcn_element_ids, function(k,id) {
                        ce.checked_ghcn_element_ids.push(id);
                    });
                }
            }

            var dataFetcher = new ce.DataFetcher(stationid, ce.checked_ghcn_element_ids);
            dataFetcher.done(function() {
                graph.all_tpl_promises.done(function() {
                    var mugl = graph.buildMugl(stationid, minyear, maxyear, ce.checked_elements, dataFetcher.data);
                    $('#mugltext').val(mugl);
                    $('#graph').multigraph({muglString : mugl});
                });
            });

        });

    };

    function element_list_contains_element_with_id(elements, id) {
        var i;
        for (i=0; i<elements.length; ++i) {
            if (elements[i].id === id) {
                return true;
            }
        }
        return false;
    }

    function datas_to_values(datas, transforms) {
        //     datas[0]                         datas[1]                             datas[2]
        //r[0] 199101,x,x,x,x,x,x,x,x,x,x  r[1] 199101,y,y,y,y,y,y,y,y,y,y      r[2] 199101,z,z,z,z,z,z,z,z,z,z
        //     199102,x,x,x,x,x,x,x,x,x,x       199103,y,y,y,y,y,y,y,y,y,y           199102,z,z,z,z,z,z,z,z,z,z
        //     199103,x,x,x,x,x,x,x,x,x,x       199104,y,y,y,y,y,y,y,y,y,y           199103,z,z,z,z,z,z,z,z,z,z
        //     199104,x,x,x,x,x,x,x,x,x,x       199105,y,y,y,y,y,y,y,y,y,y           199105,z,z,z,z,z,z,z,z,z,z
        //     199107,x,x,x,x,x,x,x,x,x,x                                            199106,z,z,z,z,z,z,z,z,z,z

        // populate the `values` array:
        //   values = [
        //      { '199101' : [x,x,x,x,x,x,x,x,x,x],
        //        '199102' : [x,x,x,x,x,x,x,x,x,x],
        //        '199103' : [x,x,x,x,x,x,x,x,x,x],
        //        '199104' : [x,x,x,x,x,x,x,x,x,x],
        //        '199107' : [x,x,x,x,x,x,x,x,x,x] },
        //
        //      { '199101' : [y,y,y,y,y,y,y,y,y,y],
        //        '199103' : [y,y,y,y,y,y,y,y,y,y],
        //        '199104' : [y,y,y,y,y,y,y,y,y,y],
        //        '199105' : [y,y,y,y,y,y,y,y,y,y] },
        //
        //      { '199101' : [z,z,z,z,z,z,z,z,z,z]
        //        '199102' : [z,z,z,z,z,z,z,z,z,z]
        //        '199103' : [z,z,z,z,z,z,z,z,z,z]
        //        '199105' : [z,z,z,z,z,z,z,z,z,z]
        //        '199106' : [z,z,z,z,z,z,z,z,z,z] }
        //   ]

        var values = [];
        var monthobj = {};
        $.each(datas, function (i,data) {
            var v = {};
            $.each(data.split("\n"), function (j,line) {
                if (/,/.test(line)) { // skip line unless it contains a comma
                    var cols = line.split(/\s*,\s*/);
                    v[cols[0]] = cols.slice(1);
                    monthobj[cols[0]] = true;
                }
            });
            values.push(v);
        });

        var months = [];
        $.each(monthobj, function (key,val) {
            months.push(key);
        });
        months.sort();

        var rows = [];
        $.each(months, function (m,month) {
            // set `ndays` to the number of days in this month, measured as the maximum length
            // of the arrays for this month in the `values` objects:
            var ndays = Math.max.apply(null, $.map(values, function (v) {
                if (v[month]===undefined) {
                    return 0;
                } else {
                    return v[month].length;
                }
            }));

            // loop over the days of the month, generating a row of values for each one:
            var day, cols;
            for (day=0; day<ndays; ++day) {
                cols = [ sprintf("%s%02d", month, day+1) ];
                $.each(values, function (j,v) {
                    if ((v[month]===undefined)
                        || (v[month][day]===undefined)
                        || (v[month][day]==='M')) {
                        cols.push('-9999');
                    } else {
                        if (transforms!==undefined && transforms[j]!==undefined) {
                            cols.push(transforms[j](v[month][day]));
                        } else {
                            cols.push(v[month][day]);
                        }
                    }
                });
                rows.push(cols.join(','));
            }

        });

        return rows.join("\n");
    }

    function temptransform(x) {
        var v = parseFloat(x);
        v = v / 10.0;
        return sprintf("%.1f", v);
    }

    function normaltemptransform(x) {
        var f = parseFloat(x);
        var c = (f-32.0)*5.0/9.0;
        return sprintf("%.1f", c);
    }

    function preciptransform(x) {
        var v = parseFloat(x);
        v = v / 10.0;
        return sprintf("%.1f", v);
    }

    function normalpreciptransform(x) {
        var v = parseFloat(x);
        return sprintf("%.1f", 25.4*v/10.0); // convert hundredths of inches to mm
    }


    graph.buildMugl = function(stationid, minyear, maxyear, elements, data) {

        //
        // Add vertical axes
        //
        var verticalaxes = [];
        var verticalaxis_position_delta = 50;
        var verticalaxis_position = verticalaxis_position_delta;
        if (element_list_contains_element_with_id(elements, 'TEMP')) {
            // add a temperature vertical axis
            verticalaxis_position -= verticalaxis_position_delta;
            verticalaxes.push(Mustache.render(graph.tpl['vertical-axis-tempc'], {
                position: verticalaxis_position
            }));
        }
        if (element_list_contains_element_with_id(elements, 'PRCP')) {
            // add a precip vertical axis
            verticalaxis_position -= verticalaxis_position_delta;
            verticalaxes.push(Mustache.render(graph.tpl['vertical-axis-prcpmm'], {
                position: verticalaxis_position
            }));
        }
        if (element_list_contains_element_with_id(elements, 'YTD_PRCP')) {
            // add a ytd-precip vertical axis
            verticalaxis_position -= verticalaxis_position_delta;
            verticalaxes.push(Mustache.render(graph.tpl['vertical-axis-ytd-prcpmm'], {
                position: verticalaxis_position
            }));
        }
        if (element_list_contains_element_with_id(elements, 'SNOW')) {
            // add a snow vertical axis
            verticalaxis_position -= verticalaxis_position_delta;
            verticalaxes.push(Mustache.render(graph.tpl['vertical-axis-snowmm'], {
                position: verticalaxis_position
            }));
        }
        if (element_list_contains_element_with_id(elements, 'DROUGHT_PDSI')) {
            // add a snow vertical axis
            verticalaxis_position -= verticalaxis_position_delta;
            verticalaxes.push(Mustache.render(graph.tpl['vertical-axis-pdsi'], {
                position: verticalaxis_position
            }));
        }
        if (element_list_contains_element_with_id(elements, 'NDVI')) {
            // add a snow vertical axis
            verticalaxis_position -= verticalaxis_position_delta;
            verticalaxes.push(Mustache.render(graph.tpl['vertical-axis-ndvi'], {
                position: verticalaxis_position
            }));
        }

        //
        // Add plots
        //
        var plots = [];
        if (element_list_contains_element_with_id(elements, 'TEMP')) {
            // add a normal temperature plot
            plots.push(Mustache.render(graph.tpl['plot-normal-temp'], {
            }));
        }
        if (element_list_contains_element_with_id(elements, 'TEMP')) {
            // add a temperature plot
            plots.push(Mustache.render(graph.tpl['plot-temp'], {
            }));
        }
        if (element_list_contains_element_with_id(elements, 'PRCP')) {
            // add a precip plot
            plots.push(Mustache.render(graph.tpl['plot-prcp'], {
            }));
        }
        if (element_list_contains_element_with_id(elements, 'YTD_PRCP')) {
            // add a ytd-precip plot
            plots.push(Mustache.render(graph.tpl['plot-ytd-prcp'], {
            }));
        }
        if (element_list_contains_element_with_id(elements, 'YTD_PRCP')) {
            // add a normal ytd-precip plot
            plots.push(Mustache.render(graph.tpl['plot-normal-ytd-prcp'], {
            }));
        }
        if (element_list_contains_element_with_id(elements, 'SNOW')) {
            // add a precip plot
            plots.push(Mustache.render(graph.tpl['plot-snow'], {
            }));
        }
        if (element_list_contains_element_with_id(elements, 'DROUGHT_PDSI')) {
            // add a precip plot
            plots.push(Mustache.render(graph.tpl['plot-drought-pdsi'], {
            }));
        }
        if (element_list_contains_element_with_id(elements, 'NDVI')) {
            // add a precip plot
            plots.push(Mustache.render(graph.tpl['plot-ndvi'], {
            }));

        }

        //
        // Add data sections
        //
        var datas = [];
        if (element_list_contains_element_with_id(elements, 'TEMP')) {
            // add a temperature data section
            datas.push(Mustache.render(graph.tpl['data-normal-temp'], {
                values : datas_to_values([data['NORMAL_TMIN'],data['NORMAL_TMAX']], [normaltemptransform,normaltemptransform])
            }));
        }
        if (element_list_contains_element_with_id(elements, 'TEMP')) {
            // add a temperature data section
            datas.push(Mustache.render(graph.tpl['data-temp'], {
                values : datas_to_values([data['TMIN'],data['TMAX']], [temptransform,temptransform])
            }));
        }
        if (element_list_contains_element_with_id(elements, 'PRCP')) {
            // add a precip data section
            datas.push(Mustache.render(graph.tpl['data-prcp'], {
                values : datas_to_values([data['PRCP']], [preciptransform])
            }));
        }
        if (element_list_contains_element_with_id(elements, 'YTD_PRCP')) {
            // add a ytd-precip data section
            datas.push(Mustache.render(graph.tpl['data-ytd-prcp'], {
                values : datas_to_values([data['YTD_PRCP']], [preciptransform])
            }));
        }
        if (element_list_contains_element_with_id(elements, 'YTD_PRCP')) {
            // add a ytd-precip data section
            datas.push(Mustache.render(graph.tpl['data-normal-ytd-prcp'], {
                values : datas_to_values([data['NORMAL_YTD_PRCP']], [normalpreciptransform])
            }));
        }
        if (element_list_contains_element_with_id(elements, 'SNOW')) {
            // add a precip data section
            datas.push(Mustache.render(graph.tpl['data-snow'], {
                values : datas_to_values([data['SNOW']], [preciptransform])
            }));
        }
        if (element_list_contains_element_with_id(elements, 'DROUGHT_PDSI')) {
            // add a precip data section
            datas.push(Mustache.render(graph.tpl['data-drought-pdsi'], {
                values : data['DROUGHT_PDSI']
            }));
        }
        if (element_list_contains_element_with_id(elements, 'NDVI')) {
            // add a precip data section
            datas.push(Mustache.render(graph.tpl['data-ndvi'], {
                values : data['NDVI']
            }));
        }

        return Mustache.render(graph.tpl['mugl'], {
            marginleft   : 40 - verticalaxis_position,
            mindate      : minyear,
            maxdate      : maxyear,
            verticalaxes : verticalaxes.join(""),
            plots        : plots.join(""),
            datas        : datas.join("")
        });

    };
    
    window.graph = graph;
    
}(jQuery));
