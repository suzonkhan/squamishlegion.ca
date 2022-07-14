var sfm_globalize_inited=false;

function sfm_calendar_global_init()
{
    var local = Globalize.culture();
    $.datepicker.regional[Globalize.culture().name]=
    {
        closeText:'', 
        prevText:'', 
        nextText:'', 
        currentText:'', 
        monthNames:local.calendars.standard.months.names,
        monthNamesShort:local.calendars.standard.months.namesAbbr,
        dayNames: local.calendars.standard.days.names,
        dayNamesShort:local.calendars.standard.days.namesAbbr,
        dayNamesMin:local.calendars.standard.days.namesShort,
        weekHeader:'wk', 
        dateFormat:'', 
        firstDay:local.calendars.standard.firstDay, 
        isRTL:local.isRTL
        /*showMonthAfterYear*/
        /*yearSuffix*/
        
    };
    $.datepicker.setDefaults($.datepicker.regional[Globalize.culture().name]);
    
    moment.lang(Globalize.culture().name, 
    {
        months : local.calendars.standard.months.names,
        monthsShort :local.calendars.standard.months.namesAbbr,
        weekdays : local.calendars.standard.days.names,
        weekdaysShort : local.calendars.standard.days.namesAbbr
    });
}

function sfm_calendar(settings_param)
{
    if(false == sfm_globalize_inited)
    {
        sfm_calendar_global_init();
        sfm_globalize_inited=true;
    }
    
    this.defaults=
    {
        date_format: Globalize.culture().calendars.standard.patterns.d,
        input_id:'',
        image_id:'',
        form_id:'',
        smart_init:'',
        mirror:false
    };
    var settings = $.extend(this.defaults,settings_param||{});
    
    var format_map_jquerydt=
    {
    	'd':'d',
        'dd':'dd',
        'ddd':'D',
        'dddd':'DD',
        'M':'m',
        'MM':'mm',
        'MMM':'M',
        'MMMM':'MM',
        'yy':'y',
        'yyyy':'yy'
    };
    
    var format_map_moment=
    {
        'd':'D',
        'dd':'DD',
        'ddd':'ddd',
        'dddd':'dddd',
        'yy':'YY',
        'yyyy':'YYYY',
        't':'A',
        'tt':'A' 
    };  
    
    this.convert_format=function(g_format,map)
    {                                  
      var ret_format = g_format.replace(/(\w+)/g,function(a, b)
                { return map[b]?map[b]:b;} );
      return ret_format;
    }
    var input_obj = $('form#'+settings_param.form_id+' #'+settings_param.input_id).get(0);
    var $calendar_obj = null;
    var moment_format = '';
    this.init = function()
    {
        var $input_obj = $(input_obj);
        
        input_obj.sfm_calendar_obj = this;
        
        moment_format = this.convert_format(settings.date_format,format_map_moment);

        var opts = 
        {
            showOn: 'button',changeMonth:true,changeYear:true,
            showAnim:'',constrainInput:false,
            dateFormat:this.convert_format(settings.date_format,format_map_jquerydt),
            beforeShow:function(input, inst)
            {
                $(input).datepicker('setDate',input.getcal());
            }
        };
        if(settings.yearRange)
        {
            opts['yearRange'] = settings.yearRange;
        }
        
        $calendar_obj = $input_obj.datepicker(opts);
        
        $('#'+settings.image_id,input_obj.form).click(function()
        {
            $calendar_obj.datepicker('show');
            $calendar_obj.datepicker("widget").position({
                    my: "left top",
                    at: "right top",
                    of: this
                });
        }); 
        $calendar_obj.datepicker('widget').draggable().addClass('sfm_datepicker');
        //$calendar_obj.datepicker('widget').css({'z-index':99});
        
        input_obj.sfm_user_updated=false;
        
        var init_value = $.trim($input_obj.val());
        if(init_value.length > 0)
        {
            input_obj.sfm_user_updated=true;
        }
        
        $(input_obj).change(function()
        {
            this.sfm_user_updated=true;
            input_obj.update_mirror();
            
            if(this.form.validator)
            {
                this.form.validator.livevalidate(this,'correction');
            }
        });
        
        $(input_obj.form).submit(function()
        {
            input_obj.update_mirror();
            return true;
        });
        if(settings.mirror)
        {
            var $mirror_obj = $('#'+settings.mirror,input_obj.form);
            if($mirror_obj.length > 0)
            {
                input_obj.dup_mirror = $mirror_obj.get(0);
                /*mirror_obj.mirror = input_obj;
                mirror_obj.sfm_validate=function(validator,mvalue)
                {
                    return this.mirror.sfm_validate(validator,mvalue);
                }*/
            }
            input_obj.update_mirror();
        }
        this.smart_init();
    }
    
    input_obj.update_mirror = function()
    {
        if(input_obj.dup_mirror)
        {
            var m = moment(this.getcal());
            var val='';
            if(m)
            {
                val = m.format('YYYY-MM-DD');
            }
            $(input_obj.dup_mirror).val(val);
        }
    };
    
    input_obj.getcal = function()
    {
        //return Globalize.parseDate($(this).val());
        var val = $(this).val();
        var m = moment(val,moment_format);
        if(!m){ return null;}
        var dt = m.toDate();
        return dt;
    };
    
    input_obj.sfm_validate=function(validator,mvalue)
    {
        var ret = true;
        switch(validator)
        {
            case 'required':
            {
                return 'default';
            }
            break;
            case "after_date"://29
            {
                ret = sfm_testDateComparison(this,mvalue,/*test_after*/true)
                break;
            }
            case "before_date"://30
            {
                ret = sfm_testDateComparison(this,mvalue,/*test_after*/false)
                break;
            }            
        }
        return ret;    
    };
    
    input_obj.setcal=function(dateobj)
    {
        var val = ''
        if(dateobj)
        {
            val = moment(dateobj).format(moment_format);
        }
        $(this).val(val);
    }
    
    
    this.smart_init=function()
    {
        settings.smart_init = $.trim(settings.smart_init);
        if(settings.smart_init == ''){ return; }

        this.date_calc = new sfm_DateCalcObj();
        if(true === this.date_calc.parse(settings.smart_init))
        {
            var vars = this.date_calc.get_variables();
            if(!vars)
            {
                return;
            }
            for(var v=0;v<vars.length;v++)
            {
                var disp_input = getDispInput(vars[v]);
                $('#'+disp_input,input_obj.form).change(function()
                {
                    input_obj.eval_value(/*isevt*/true);
                });
                $('#'+disp_input,input_obj.form).bind('keyup',function()
                {
                    input_obj.eval_value(/*isevt*/true);
                });            
            }
        }
        else
        {
            $(input_obj).val(settings.smart_init);
            // can be fixed date like 1/2/2017
        }
        input_obj.eval_value(/*isevt*/false);    
    };
    
    function getDispInput(varname)
    {
        return varname;
    }
    
    input_obj.eval_value=function(isevt)
    {
        var val = $.trim($(this).val());
        if(val.length > 0)
        {//Should we initialize if there is already a value?
            if(!isevt){return;}
            if(input_obj.sfm_user_updated){return;}
        }
        
        var vars = this.sfm_calendar_obj.date_calc.get_variables();
        var values={};
        for(var v=0;v<vars.length;v++)
        {
            values[vars[v]] = getFieldValue(vars[v], input_obj.form);
            
            if(false === values[vars[v]])
            {
                console.warn && console.warn("date field smart init: variable not found "+vars[v]);
                return;
            }
            if(values[vars[v]] == null ||
               values[vars[v]] == false)
            {
                return;
            }
        }
        var dt = this.sfm_calendar_obj.date_calc.evaluate(values);
        this.setcal(dt);
        this.update_mirror();
    };
    
    function getFieldValue(field_id,formobj)
    {
        var retval=false;
        var $inp = $('#'+getDispInput(field_id),formobj);
        
        if($inp.length <= 0)
        {//could be a number
            $inp = $('#'+field_id,formobj);
        }
        
        if( $inp.length > 0)
        {
            var inpobj = $inp.get(0);
            if(inpobj.getcal)
            {
                retval = inpobj.getcal();
            }
            else
            {
                retval = $(inpobj).val();
            }                
        }
        else if(typeof(sfm_IsFormSaved)== typeof(Function) && sfm_IsFormSaved(formobj.id))
        {
            retval = getFromSessVars(formobj.id,field_id);
        }    
        return retval;
    }
    
    function getFromSessVars(formid,varname)
    {
        var disp_inp_name = getDispInput(varname);
        var value = sessvars.simform[formid].vars[disp_inp_name];
        if(typeof value == 'undefined')
        {//could be a number or calc field
            value = sessvars.simform[formid].vars[varname];
            return value;
        }
        var m = moment(value,moment_format);
        var ret = false;
        if(m)
        { 
            ret = m.toDate();
        }
        return ret;
    }
    function sfm_testDateComparison(objValue,cmdvalue,test_after)
    {
        var ret=true;

        if(objValue.value.length <= 0)
        {//The 'required' validation is not done here
            return true;
        }
        var dateother = sfm_val_getOtherDate(objValue,cmdvalue);
        var valuedateobj =  objValue.getcal();
        if(dateother && valuedateobj)
        {
            var error = false;
            if(test_after)
            {
                ret = sfm_compare_dates(dateother,valuedateobj) <= 0? false : true;
            }
            else
            {//test_before
                ret = sfm_compare_dates(dateother,valuedateobj) >= 0? false: true;
            }
        }
        return ret;
    }

    function sfm_val_getOtherDate(objValue,cmdvalue)
    {
        var date_ret;
        if(cmdvalue == "SameDay")
        {
            date_ret = new Date();
        }
        else
        {
            var ret_arr = cmdvalue.match(/^(\w+)\(([\d\w\-]+)\)$/);
            if('FixedDate' == ret_arr[1])
            {
                var date_str = ret_arr[2];
                var date_arr = date_str.match(/^(\d*)\-(\d*)\-(\d*)$/);
                date_ret = new Date();
                date_ret.setFullYear(parseInt(date_arr[1],10));
                date_ret.setMonth(parseInt(date_arr[2],10)-1);
                date_ret.setDate(parseInt(date_arr[3],10));
            }
            else
            if('Field' == ret_arr[1])
            {
                var field_name = ret_arr[2];
                //date_ret = objValue.form.elements[field_name].getcal();
                date_ret = getFieldValue(field_name,objValue.form);
            }
        }
        return date_ret;
    }

    function sfm_compare_dates(date1,date2)
    {
        var d1 = moment(date1).format('YYYY-MM-DD');
        var d2 = moment(date2).format('YYYY-MM-DD');
        if(d1 < d2 )
        {
            return 1;
        }
        else
        if(d1 > d2)
        {
            return -1;
        }
        else
        {
            return 0;
        }
    }
    
    try
    {
        this.init();
    }
    catch(e)
    { 
        (typeof console == "object") && console.warn('Error in Date init :'+e);
    }
}

function sfm_DateCalcObj(settings_param)
{

    this.defaults={date_format:Globalize.culture().calendars.standard.patterns.d};
    var settings = $.extend(this.defaults,settings_param||{});
    
    this.matched_rule=-1;
    this.parse=function(formula)
    {
        try
        {
            for(var i=0;i<sentences.length;i++)
            {
                if(sentences[i].parse(formula))
                {
                    this.matched_rule = i;
                    break;
                }
            }
            return (this.matched_rule >= 0) ? true:false;
        }
        catch(err)
        {
            return false;
        }
    };
    
    this.evaluate = function(vars)
    {
        if(this.matched_rule>=0)
        {
            return sentences[this.matched_rule].evaluate(vars);
        }
        return false;
    };
    
    this.get_variables = function()
    {
        if(this.matched_rule >= 0)
        {
            return sentences[this.matched_rule].obj.variables;
        }
        return false;
    }
    
    var sentences=
    [
        {//simple add
            obj:
            {
                variables:[],
                param1:'today',
                param2:0,
                operator:'+',
                unit:'day'
            },
            parse:function(str)
            {
                                       //xx +  p days/months/years/week
                var matches = str.match(/^\s*(\w+)\s*([\+\-])\s*([\d]+|[\w]+)\s*(day|month|year|week)s?\s*$/);
                if(!matches || matches.length < 5){return false;}
                if(matches[1].toLowerCase() != 'today')
                {
                    this.obj.variables.push(matches[1]);
                    this.obj.param1=matches[1];
                }
                this.obj.operator=matches[2];
                var float_val = parseFloat(matches[3]);
                if(isNaN(float_val))
                {
                    this.obj.param2 = matches[3];
                    this.obj.variables.push(matches[3]);
                }
                else
                {
                    this.obj.param2 = float_val;
                }
                this.obj.unit = matches[4]+'s';
                return true;
            },
            evaluate:function(vars)
            {
                var m=moment();
                
                if(this.obj.param1 != 'today')
                {
                  m = moment(vars[this.obj.param1]);
                  if(!m){return null;}
                }
                var p = this.obj.param2;
                if(isNaN(this.obj.param2))
                {
                    p = parseInt(vars[this.obj.param2]);
                }
                if(this.obj.operator == '+')
                {
                    m.add(this.obj.unit,p);
                }
                else if(this.obj.operator == '-')
                {
                    m.subtract(this.obj.unit,p);
                }
                
                return m.toDate();
            }
        },
        {//today or other_date
            obj:
            {
                variables:[],
                param1:'today'
            },
            parse:function(str)
            {
                var matches = str.match(/^\s*(\w+)\s*$/);
                if(!matches || matches.length != 2){ return false;}
                if(matches[1].toLowerCase() != 'today')
                {
                    this.obj.variables.push(matches[1]);
                    this.obj.param1=matches[1];
                }
                return true;
            },
            evaluate:function(vars)
            {
                var m=moment();
                
                if(this.obj.param1 != 'today')
                {
                  m = moment(vars[this.obj.param1]);
                }                
                return m.toDate();
            }            
        },        
        {// dd/mm/yyyy or mm/dd/yyyy or mon/dd/yyyy
            obj:
            {
                date_obj:null,
                variables:[]
            },
            parse:function(str)
            {
                var dt = moment(str,settings.date_format);
                var formatted = dt.format(settings.date_format);
                if( formatted == str)
                {
                    this.obj.date_obj=dt.toDate();
                    return true;
                }
                return false;
            },
            evaluate:function(vars)
            {
                return this.obj.date_obj;
            }
        }
    ];
    return this;
}
