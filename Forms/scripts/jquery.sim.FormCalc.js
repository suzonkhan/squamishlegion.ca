function sfm_condition_check(condn,formname)
{
    return $.sfm_evaluateFormula(condn,formname)?true:false;
}

(function($)
{
    /*
    This plugin uses source from the page below:
    http://silentmatt.com/javascript-expression-evaluator/
    */
    $.fn.formCalc = function(formula,options_param)
    {
        var calcobjs = [];
        var options = options_param || {value_maps:false,currency_format:false};
        
        this.filter('input').each(function()
        {
            function makeCalcUpdateCallback(calc_input)
            {
                return function(value)
                        {
                           setCalcFieldValue(calc_input,value);
                        }
            }
            function setCalcFieldValue(calc_field,value)
            {
                if(typeof value == 'number' && isNaN(value))
                {
                    (typeof(console) === 'object') && console.warn(calc_field.name+": got NaN result");
                    value='';
                }
                if(calc_field.sfm_options.mirror_field)
                {
                    $(calc_field.sfm_options.mirror_field).val(value);
                }
                
                if(value === '' || value === 0)
                {
                    calc_field.sfm_num_val = 0;
                }
                else
                {
                    calc_field.sfm_num_val = value;
                }
                
                if(calc_field.sfm_options.currency_format )
                {
                    value = sfm_format_currency(value,1,calc_field.sfm_options.cur_symbol);
                }
                else
                {//This is so that for countries where decimal point is different,
                //the number is displayed properly, per their format
                    if(convfx.isNumber(value))
                    {
                        value = sfm_simple_format_number(value);    
                    }
                }
                
                $(calc_field).val(value);
				$(calc_field).trigger('change');
            }
            
            var this_calcfield = this;
            this_calcfield.sfm_options=options;
            if(options.mirror)
            {
                var mirrorobj = this_calcfield.sfm_options.mirror_field = $('#'+options.mirror,this.form).get(0);
            }
            
            calcobjs.push(new FormCalcObj(
                {formula:formula,formobj:this.form,calc_callback:makeCalcUpdateCallback(this)},options.value_maps));
        });
        
        return this;
    }
    
    $.fn.dispCondition = function(condition,formname)
    {
        var calcobjs = [];
        this.each(function()
        {
            function makeDispUpdateCallback(divobj)
            {
                return function(value)
                        {
                           showHideObj(divobj,value);
                        }
            }
            function showHideObj(divobj,value)
            {
                if(value)
                {
                    $(divobj).show();
                }
                else
                {
                    $(divobj).hide();
                }
            }
            var formobj = getFormObj(formname);
            calcobjs.push(new FormCalcObj(
                {formula:condition,formobj:formobj,calc_callback:makeDispUpdateCallback(this)},{}));
        });
        return this;
    }
    
    $.sfm_evaluateFormula = function(formula,formname)
    {
        var formobj = getFormObj(formname);
        var calc_obj = new FormCalcObj(
                {formula:formula,formobj:formobj,handle_input_events:false},{});
                
        return calc_obj.evaluate();
    }
    
    /*********************************************************/
    /* FormCalcObj class                                    */
    /*********************************************************/
    function FormCalcObj(options,value_maps)
    {
        var m_expr_obj='';
        
        var defaults=
        {
          formula:'',
          formobj:{},
          calc_callback:null,
          handle_input_events:true
        };
        
        var m_settings = $.extend(defaults,options||{});
        
        var m_value_maps = value_maps||{};
        var m_func_map = sfm_gen_funcmap;
        var m_variables={};
        var m_formname = $(m_settings.formobj).attr('name')||$(m_settings.formobj).attr('id');
        init_calc();
        
        function init_calc()
        {
            m_expr_obj = Parser.parse(m_settings.formula);
            var var_array = m_expr_obj.variables();
            
            for(var v=0; v < var_array.length;v++)
            {
                var name = var_array[v];
                m_variables[name]= getInputDetails(name);
                //no events to handle if the item is on another page
                if( m_settings.handle_input_events &&
                    !m_variables[name]['isfunction'] && 
                    !m_variables[name]['isSaved'] )
                {
                    bind_input_events(name);
                }
            }
            if(m_settings.handle_input_events)
            {
                $(document).ready(function(){calculate();});
            }
        }
        
        function calculate()
        {
            if(m_settings.calc_callback)
            {
                m_settings.calc_callback(evaluate_internal());
            }
            else
            {
                //console.log('calc_callback is null!');
            }
        }
        
        this.evaluate = function()
        {
            return evaluate_internal();
        }
        
        function evaluate_internal()
        {
            var eval_map = $.extend(m_func_map,getFormValueMap(m_settings.formobj));
            var value = m_expr_obj.evaluate(eval_map);

            return value;        
        }
        function bind_input_events(input_name)
        {
            var input_type = m_variables[input_name]['type'];
            
            var events2handle=[];
            
            events2handle.push('keyup');
            events2handle.push('change');
            if(input_type =='checkbox_group')
            {//for multi-select
                events2handle.push('live_click');
            }
            else if( input_type =='radio'||
                input_type =='checkbox'||
                input_type == 'select_group'
                )
            {
                events2handle.push('click');
            }
            //console.log(events2handle);
            var selector='[name='+m_variables[input_name]['selname']+']';
            for(var e=0; e < events2handle.length ;e++)
            {
                if('live_click' == events2handle[e])
                {
                    $(selector,m_settings.formobj).live('click',
                        function(){calculate(); return 1;});    
                    $(selector,m_settings.formobj).live('change',
                        function(){calculate(); return 1;});
                }
                else
                {
                    $(selector,m_settings.formobj).bind(events2handle[e],
                        function(){calculate(); return 1;});
                }
            }
        
        }
        
        function getFormValueMap()
        {
            var var_array = m_expr_obj.variables();
            var formvalues = $(m_settings.formobj).serializeArray();
            var var_values={};
            for(var v=0; v < var_array.length;v++)
            {
                var name = var_array[v];
                if(m_variables[name]['isfunction']){continue;}

                if(m_variables[name]['type']== 'checkbox_group' ||
                   m_variables[name]['type'] == 'select_group' ||
                   m_variables[name]['type'] == 'saved_group')
                {
                    var_values[name] = makeGetGroupItem(name,m_settings.formobj);
                    continue;
                }
                var_values[name] = getValueForField(name,m_settings.formobj);
            }
            return var_values;
        }
        
        function makeGetGroupItem(name,formobj)
        {
            return function(val_param)
                    {
                        return getValueForField(name,formobj,val_param);            
                    };
        }
        
        function getInputDetails(name)
        {
            var details={selname:name,group:false,isfunction:false,isSaved:false};
            if(typeof m_func_map[name] == 'function')
            {
                details['type']='function';
                details['isfunction']=true;
                return details;
            }
            
            var inp = $('[name='+name+']',m_settings.formobj).get(0);
            var group='';
            if(!inp)
            {
                inp = $('[name="'+name+'[]"]',m_settings.formobj).get(0);
                if(inp)
                {
                    details['selname']='"'+name+'[]"';//need group name
                    group='_group';
                    details['group']=true;
                }
            }
            
            if(inp)
            {
                var tagname = inp.tagName.toLowerCase();
                
                if(tagname == 'input')
                {
                    details['type'] = $('input[name='+details['selname']+']',m_settings.formobj).attr('type');
                }
                else
                {
                    details['type'] = tagname;
                }
                if(details['type'] == 'text' && inp.getcal )
                {
                    details['type'] = 'date';
                }
            }
            else
            {//search in saved form values
                if(typeof(sfm_IsFormSaved)== typeof(Function) && sfm_IsFormSaved(m_formname))
                {
                    if(sessvars.simform[m_formname].vars.hasOwnProperty(name))
                    {
                        details['type']='saved';
                        details['isSaved']=true;
                    }
                    else if(sessvars.simform[m_formname].vars.hasOwnProperty(name+'[]'))
                    {
                        details['type']='saved';
                        details['isSaved']=true;
                        details['selname']='"'+name+'[]"';//need group name
                        group='_group';
                        details['group']=true;
                    }
                }
            }
            if(details['type']){details['type'] += group;}
            //console.log('details ');
            //console.log(details);
            return details;
        }
        
        function getValueForField(name,formobj,val_param)
        {
            //var val = $('#'+name,formobj).val();
            var val=0;
            switch(m_variables[name]['type'])
            {
                case 'radio':
                {
                   val = $('input[name='+name+']:checked',formobj).val();
                   if(typeof val == 'undefined')
                   {
                        val=0;
                   }
                   break;
                }
                case 'date':
                {
                    val = $('input[name='+name+']',formobj).get(0).getcal();
                    break;
                }
                case 'checkbox':
                {
                    val = $('input[name='+name+']:checked',formobj).val();
                    if(typeof val == 'undefined')
                    {
                        val=0;
                    }
                    else if(typeof val != 'number' &&
                       !m_value_maps[name])
                    {
                        val=1;
                    }
                    break;
                }
                case 'checkbox_group':
                {
                    var checked = $('input[name="'+name+'[]"][value="'+val_param+'"]',formobj).is(':checked');
                    
                    val = checked ? 1 : 0;
                   
                    if(val && m_value_maps[name] && 
                    (typeof m_value_maps[name][val_param] != 'undefined'))
                    //If a mapping is available, take it
                    {
                        val = val_param;
                    }
                    
                    break;
                }
                case 'select_group':
                {
                    var selected = $('select[name="'+name+'[]"] option[value="'+val_param+'"]',formobj).is(':selected');
                    
                    if(m_value_maps[name])
                    {
                        val = val_param;
                    }
                    else
                    {
                        if(typeof val_param == 'number')
                        {
                            val = selected ? val_param : 0;
                        }
                        else
                        {
                            val = selected ? 1 : 0;
                        }
                    }
                    break;
                }
                case 'saved':
                {
                    if(typeof sessvars.simform[m_formname].vars[name] != 'undefined' )
                    {
                        val = sessvars.simform[m_formname].vars[name];
                    }
                    break;
                }
                case 'saved_group':
                {
                    val = ($.inArray(val_param,sessvars.simform[m_formname].vars[name+'[]']) >= 0 ) ? 1: '';
                    break;
                }
                
                default:
                {
                    var $input = $('[name='+m_variables[name]['selname']+']',formobj);
                    
                    if($input.size()>0)
                    {
                        val = typeof $input[0].sfm_num_val === 'undefined' ? $input.val():$input[0].sfm_num_val;
                    }
                }
            }
            
            if(m_value_maps[name])
            {
                if(typeof m_value_maps[name][val] != 'undefined')
                {
                    val = m_value_maps[name][val];
                }
            }
            return val;
        }
    } //FormCalcObj
    
    /*********************************************************/
    /* Calculation Functions & Helper functions              */
    /*********************************************************/
    function getFormObj(formname)
    {
        var formobj;
        if(formname)
        { 
            formobj = document.forms[formname];
        }
        else
        {
            formobj = document.forms[0];
        }
        return formobj;
    }
    
    function sfm_str_trim_ex(strInParam)
    {
        var strIn = strInParam.toString();
        return strIn.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }

    function sfm_compare_strings_ex(str1,str2)
    {
        str1 = sfm_str_trim_ex(str1);
        str2 = sfm_str_trim_ex(str2);
        return (str1 === str2)?1:0;
    }

    function sfm_get_utc_timestamp(dt)
    {
        return (Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate()));
    }

    function sfm_date_diff(d1,d2)
    {
        var msecsperday = 1000 * 60 * 60 * 24;

        if(typeof(d1)=='string')
        {
            d1 = Globalize.parseDate(d1);
        }
        if(typeof(d2)=='string')
        {
            d2 = Globalize.parseDate(d2);
        }        
        var utcd1 = sfm_get_utc_timestamp(d1);
        var utcd2 = sfm_get_utc_timestamp(d2);

        var days = Math.ceil( (utcd1- utcd2) /msecsperday);

        return days;
    }
    var convfx = 
    {
        getNumber:function(param)
        {
            if(typeof(param)=='number')
            { 
                return param; 
            }
            else
            { 
                if($.trim(param)== ''){ return 0; }
                return Globalize.parseFloat(param); 
            }
        },
        isNumber:function(param)
        {
            if(typeof(param)=='number'){return true};
            return ! isNaN(param-0);
        }
        
    }
    var sfm_gen_funcmap = 
    {
        max:function()
        {
            var values = arguments;
            var len  = arguments.length;

            if(len <= 0){ return 0; }

            var max=convfx.getNumber(values[0]);
            for(var i = 1;i<len;i++)
            {
                var val = convfx.getNumber(values[i]);
                if(val > max)
                {
                    max = val;
                }
            }
            return max;
        },
        
        min:function()
        {
            var values = arguments;
            var len  = arguments.length;

            if(len <= 0){ return 0; }

            var min=convfx.getNumber(values[0]);
            for(var i = 1;i<len;i++)
            {
                var val = convfx.getNumber(values[i]);
                if( val < min)
                {
                    min = val;
                }
            }
            return min;
        },
        avg:function()
        {
            var values = arguments;
            var len  = arguments.length;

            if(len <= 0){ return 0; }

            var sum=0;
            for(var i = 0;i<len;i++)
            {
                sum += convfx.getNumber(values[i]);
            }
            var avg = sum/len;
            return avg;
        },
        concat:function()
        {
            var values = arguments;
            var len  = arguments.length;

            if(len <= 0){ return 0; }
            var ret='';
            for(var i = 0;i<len;i++)
            {
                ret += values[i].toString();
            }
            return ret;
        },
		
        pow:function (x,y)
        {
            return Math.pow(convfx.getNumber(x),convfx.getNumber(y));
        },
		
        if_else:function(condn,if_true,if_false)
        {
            if(condn)
            {
                return if_true;
            }
            else
            {
                return if_false;
            }
        },
        str:function(s)
        {
            return s;
        },
        
        round:function(num_p,dec_p)
        {
            var num = convfx.getNumber(num_p);
            var dec = convfx.getNumber(dec_p);
            var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
            return result;
        },
        
        perc_of:function(total_p,perc_p)
        {
            var total = convfx.getNumber(total_p);
            var perc  = convfx.getNumber(perc_p);
            return((total*perc)/100);
        },
        
        find_perc:function(fraction_p,max_p)
        {
            var fraction = convfx.getNumber(fraction_p);
            var max  = convfx.getNumber(max_p);
            return((fraction*100)/max);
        },
        
        days_between:function(date1,date2)
        {
            if(!date1 || !date2)
            {
                return null;
            }

            return sfm_date_diff(date1,date2);
        },
        
        days_from_today:function(other_date)
        {
            if(!other_date)
            {
                return null;
            }

            return sfm_date_diff(other_date,new Date());
        },
        month:function(the_date)
        {
            if(!the_date)
            {
                return 0;
            }
            return the_date.getMonth()+1;
        },
        year:function(the_date)
        {
            if(!the_date)
            {
                return 0;
            }
            return the_date.getFullYear();
        },
        day_of_month:function(the_date)
        {
            if(!the_date)
            {
                return 0;
            }
            return the_date.getDate();
        },
        day_of_week:function(the_date)
        {
            if(!the_date)
            {
                return 0;
            }
            //1 -> Sunday
            //7-> Saturday
            return the_date.getDay()+1;
        },
        age:function(other_date)
        {
            if(!other_date)
            {
                return null;
            }
            return Math.floor(sfm_date_diff(new Date(),other_date)/365);
        },
        format_currency:function(amount,add_comma)
        {
            return sfm_format_currency(amount);
        },

        //v4 update: The jquery.sim.FormCalc plugin handles checking the chk box state
        // is_checked() & SFM_is_checked_grp() functions are provided for backward compatibility
        // the checkboxname or chkbox['value'] can be used inside the formula
        is_checked_grp:function(value,objcheck)
        {
            var ret = objcheck.call(undefined, value);
            return ret;
        },

        is_checked:function(objcheck)
        {
            return objcheck ? 1:0;
        },
        
        map_to_number:function(mapstr,curvalue)
        {
            curvalue = sfm_str_trim_ex(curvalue);

            var maps = mapstr.split(",");
            
            for(var m=0;m<maps.length;m++)
            {
                var parts = maps[m].split("=>");
                var str = sfm_str_trim_ex(parts[0]);
                var val = parts[1];
                
                if(curvalue == str)
                {
                    return convfx.getNumber(val);
                }
            }
            return 0;
        },
        
        is_selected:function(select,value)
        {
            var ret =0;
            if(typeof(select) === 'undefined'|| select == null)
            {
                ret = false;
            }
            else if(typeof(select) =='function')
            {
                ret = (select.call(undefined, value))?1:0;
            }
            else
            {
                ret = sfm_compare_strings_ex(select,value);
            }
            
            return ret;
        },
        
        is_equal:function(a,b)
        {
            return sfm_compare_strings_ex(a,b);
        },
        
        contains:function(input,value)
        {
            var strInput = input.toString();
            return (strInput.search(value.toString())>=0) ? 1 : 0;
        },
        is_empty:function(input)
        {        
            input = sfm_str_trim_ex(input);
            return (input === '') ? 1 : 0;
        }
    };
    
    /*********************************************************/
    /* Formula Parser class                                   */
    /*********************************************************/
    /*
    Source from:
    http://silentmatt.com/javascript-expression-evaluator/
    
    */
    /*
     Based on ndef.parser, by Raphael Graf(r@undefined.ch)
     http://www.undefined.ch/mparser/index.html
    */
    //  Added by stlsmiths 6/13/2011
    //  re-define Array.indexOf, because IE doesn't know it ...
    //
    //  from http://stellapower.net/content/javascript-support-and-arrayindexof-ie
        if (!Array.indexOf) {
            Array.prototype.indexOf = function (obj, start) {
                for (var i = (start || 0); i < this.length; i++) {
                    if (this[i] === obj) {
                        return i;
                    }
                }
                return -1;
            }
        }

    var Parser = (function (scope) {
        function object(o) {
            function F() {}
            F.prototype = o;
            return new F();
        }

        var TNUMBER = 0;
        var TOP1 = 1;
        var TOP2 = 2;
        var TVAR = 3;
        var TFUNCALL = 4;

        function Token(type_, index_, prio_, number_) {
            this.type_ = type_;
            this.index_ = index_ || 0;
            this.prio_ = prio_ || 0;
            this.number_ = (number_ !== undefined && number_ !== null) ? number_ : 0;
            this.toString = function () {
                switch (this.type_) {
                case TNUMBER:
                    return this.number_;
                case TOP1:
                case TOP2:
                case TVAR:
                    return this.index_;
                case TFUNCALL:
                    return "CALL";
                default:
                    return "Invalid Token";
                }
            };
        }

        function Expression(tokens, ops1, ops2, functions) {
            this.tokens = tokens;
            this.ops1 = ops1;
            this.ops2 = ops2;
            this.functions = functions;
        }

        // Based on http://www.json.org/json2.js
        var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
            escapable = /[\\\'\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
            meta = {    // table of character substitutions
                '\b': '\\b',
                '\t': '\\t',
                '\n': '\\n',
                '\f': '\\f',
                '\r': '\\r',
                "'" : "\\'",
                '\\': '\\\\'
            };

        function escapeValue(v) {
            if (typeof v === "string") {
                escapable.lastIndex = 0;
                return escapable.test(v) ?
                    "'" + v.replace(escapable, function (a) {
                        var c = meta[a];
                        return typeof c === 'string' ? c :
                            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                    }) + "'" :
                    "'" + v + "'";
            }
            return v;
        }

        Expression.prototype = {
            simplify: function (values) {
                values = values || {};
                var nstack = [];
                var newexpression = [];
                var n1;
                var n2;
                var f;
                var L = this.tokens.length;
                var item;
                var i = 0;
                for (i = 0; i < L; i++) {
                    item = this.tokens[i];
                    var type_ = item.type_;
                    if (type_ === TNUMBER) {
                        nstack.push(item);
                    }
                    else if (type_ === TVAR && (item.index_ in values)) {
                        item = new Token(TNUMBER, 0, 0, values[item.index_]);
                        nstack.push(item);
                    }
                    else if (type_ === TOP2 && nstack.length > 1) {
                        n2 = nstack.pop();
                        n1 = nstack.pop();
                        f = this.ops2[item.index_];
                        item = new Token(TNUMBER, 0, 0, f(n1.number_, n2.number_));
                        nstack.push(item);
                    }
                    else if (type_ === TOP1 && nstack.length > 0) {
                        n1 = nstack.pop();
                        f = this.ops1[item.index_];
                        item = new Token(TNUMBER, 0, 0, f(n1.number_));
                        nstack.push(item);
                    }
                    else {
                        while (nstack.length > 0) {
                            newexpression.push(nstack.shift());
                        }
                        newexpression.push(item);
                    }
                }
                while (nstack.length > 0) {
                    newexpression.push(nstack.shift());
                }

                return new Expression(newexpression, object(this.ops1), object(this.ops2), object(this.functions));
            },

            substitute: function (variable, expr) {
                if (!(expr instanceof Expression)) {
                    expr = new Parser().parse(String(expr));
                }
                var newexpression = [];
                var L = this.tokens.length;
                var item;
                var i = 0;
                for (i = 0; i < L; i++) {
                    item = this.tokens[i];
                    var type_ = item.type_;
                    if (type_ === TVAR && item.index_ === variable) {
                        for (var j = 0; j < expr.tokens.length; j++) {
                            var expritem = expr.tokens[j];
                            var replitem = new Token(expritem.type_, expritem.index_, expritem.prio_, expritem.number_);
                            newexpression.push(replitem);
                        }
                    }
                    else {
                        newexpression.push(item);
                    }
                }

                var ret = new Expression(newexpression, object(this.ops1), object(this.ops2), object(this.functions));
                return ret;
            },

            evaluate: function (values) {
                values = values || {};
                var nstack = [];
                var n1;
                var n2;
                var f;
                var L = this.tokens.length;
                var item;
                var i = 0;
                for (i = 0; i < L; i++) {
                    item = this.tokens[i];
                    var type_ = item.type_;
                    if (type_ === TNUMBER) {
                        nstack.push(item.number_);
                    }
                    else if (type_ === TOP2) {
                        n2 = nstack.pop();
                        n1 = nstack.pop();
                        f = this.ops2[item.index_];
                        nstack.push(f(n1, n2));
                    }
                    else if (type_ === TVAR) {
                        if (item.index_ in values) {
                            nstack.push(values[item.index_]);
                        }
                        else if (item.index_ in this.functions) {
                            nstack.push(this.functions[item.index_]);
                        }
                        else {
                            throw new Error("undefined variable: " + item.index_);
                        }
                    }
                    else if (type_ === TOP1) {
                        n1 = nstack.pop();
                        f = this.ops1[item.index_];
                        nstack.push(f(n1));
                    }
                    else if (type_ === TFUNCALL) {
                        n1 = nstack.pop();
                        f = nstack.pop();
                        if (f.apply && f.call) {
                            if (Object.prototype.toString.call(n1) == "[object Array]") {
                                nstack.push(f.apply(undefined, n1));
                            }
                            else {
                                nstack.push(f.call(undefined, n1));
                            }
                        }
                        else {
                            throw new Error(f + " is not a function");
                        }
                    }
                    else {
                        throw new Error("invalid Expression");
                    }
                }
                if (nstack.length > 1) {
                    throw new Error("invalid Expression (parity)");
                }
                return nstack[0];
            },

            toString: function (toJS) {
                var nstack = [];
                var n1;
                var n2;
                var f;
                var L = this.tokens.length;
                var item;
                var i = 0;
                for (i = 0; i < L; i++) {
                    item = this.tokens[i];
                    var type_ = item.type_;
                    if (type_ === TNUMBER) {
                        nstack.push(escapeValue(item.number_));
                    }
                    else if (type_ === TOP2) {
                        n2 = nstack.pop();
                        n1 = nstack.pop();
                        f = item.index_;
                        if (toJS && f == "^") {
                            nstack.push("Math.pow(" + n1 + "," + n2 + ")");
                        }
                        else {
                            nstack.push("(" + n1 + f + n2 + ")");
                        }
                    }
                    else if (type_ === TVAR) {
                        nstack.push(item.index_);
                    }
                    else if (type_ === TOP1) {
                        n1 = nstack.pop();
                        f = item.index_;
                        if (f === "-") {
                            nstack.push("(" + f + n1 + ")");
                        }
                        else {
                            nstack.push(f + "(" + n1 + ")");
                        }
                    }
                    else if (type_ === TFUNCALL) {
                        n1 = nstack.pop();
                        f = nstack.pop();
                        nstack.push(f + "(" + n1 + ")");
                    }
                    else {
                        throw new Error("invalid Expression");
                    }
                }
                if (nstack.length > 1) {
                    throw new Error("invalid Expression (parity)");
                }
                return nstack[0];
            },

            variables: function () {
                var L = this.tokens.length;
                var vars = [];
                for (var i = 0; i < L; i++) {
                    var item = this.tokens[i];
                    if (item.type_ === TVAR && (vars.indexOf(item.index_) == -1)) {
                        vars.push(item.index_);
                    }
                }

                return vars;
            },

            toJSFunction: function (param, variables) {
                var f = new Function(param, "with(Parser.values) { return " + this.simplify(variables).toString(true) + "; }");
                return f;
            }
        };

        function add(a, b) 
        {

            return convfx.getNumber(a) + convfx.getNumber(b);
        }
        function sub(a, b) 
        {
            return convfx.getNumber(a) - convfx.getNumber(b); 
        }
        function mul(a, b) 
        {
            return convfx.getNumber(a) * convfx.getNumber(b);
        }
        function div(a, b) 
        {
            return convfx.getNumber(a) / convfx.getNumber(b);
        }
        function mod(a, b) 
        {
            return convfx.getNumber(a) % convfx.getNumber(b);
        }
        
        function lessthan(a,b)
        {
            return (convfx.getNumber(a) < convfx.getNumber(b))?1:0;
        }
        function greaterthan(a,b)
        {
            return (convfx.getNumber(a) > convfx.getNumber(b))?1:0;
        }
        
        function lessthan_or_eq(a,b)
        {
            return (convfx.getNumber(a) <= convfx.getNumber(b))?1:0;
        }
        
        function greaterthan_or_eq(a,b)
        {
            return (convfx.getNumber(a) >= convfx.getNumber(b))?1:0;
        }
        
        function equal_to(a,b)
        {
            if(convfx.isNumber(a) || convfx.isNumber(b))
            {
                return (convfx.getNumber(a) == convfx.getNumber(b))?1:0;
            }
            else 
            {
                return (a == b) ? 1 : 0;
            }
        }
        
        function not_equal_to(a,b)
        {
            if(convfx.isNumber(a) || convfx.isNumber(b))
            {
                return (convfx.getNumber(a) != convfx.getNumber(b))?1:0;
            }
            else 
            {
                return (a != b) ? 1 : 0;
            }
        }
        
        function bool_or(a,b)
        {
            return (a || b)?1:0;
        }
        
        function bool_and(a,b)
        {
            return (a && b)?1:0;
        }
        
        function neg(a) 
        {
            return -1 * convfx.getNumber(a);
        }
        
        function bool_neg(a)
        {
            return (!a)?1:0;
        }

        function random(a) 
        {
            return Math.random() * (a || 1);
        }
        function fac(a) 
        { //a!
            a = Math.floor(a);
            var b = a;
            while (a > 1) {
                b = b * (--a);
            }
            return b;
        }

        // TODO: use hypot that doesn't overflow
        function pyt(a, b) 
        {
            return Math.sqrt(a * a + b * b);
        }

        function append(a, b) 
        {
            if (Object.prototype.toString.call(a) != "[object Array]") {
                return [a, b];
            }
            a = a.slice();
            a.push(b);
            return a;
        }
        
        //Math functions
        function sin(a)
        {
            return Math.sin(convfx.getNumber(a));
        }
        function cos(a)
        {
            return Math.cos(convfx.getNumber(a));
        }
        function tan(a)
        {
            return Math.tan(convfx.getNumber(a));
        }
        function asin(a)
        {
            return Math.asin(convfx.getNumber(a));
        }
        function acos(a)
        {
            return Math.acos(convfx.getNumber(a));
        }        
        function atan(a)
        {
            return Math.atan(convfx.getNumber(a));
        }
        function sqrt(a)
        {
            return Math.sqrt(convfx.getNumber(a));
        }
        function log(a)
        {
            return Math.log(convfx.getNumber(a));
        }
        function abs(a)
        {
            return Math.abs(convfx.getNumber(a));
        }        
        function ceil(a)
        {
            return Math.ceil(convfx.getNumber(a));
        }        
        function floor(a)
        {
            return Math.floor(convfx.getNumber(a));
        }
        function exp(a)
        {
            return Math.exp(convfx.getNumber(a));
        }
        
        function Parser() {
            this.success = false;
            this.errormsg = "";
            this.expression = "";

            this.pos = 0;

            this.tokennumber = 0;
            this.tokenprio = 0;
            this.tokenindex = 0;
            this.tmpprio = 0;

            this.ops1 = {
                "sin": sin,
                "cos": cos,
                "tan": tan,
                "asin": asin,
                "acos": acos,
                "atan": atan,
                "sqrt": sqrt,
                "log": log,
                "abs": abs,
                "ceil": ceil,
                "floor": floor,
                "-": neg,
                "!": bool_neg,
                "exp": exp
            };

            this.ops2 = {
                "+": add,
                "-": sub,
                "*": mul,
                "/": div,
                "%": mod,
                "^": Math.pow,
                ",": append,
                "<": lessthan,
                ">": greaterthan,
                "<=": lessthan_or_eq,
                ">=": greaterthan_or_eq,
                "==": equal_to,
                "!=": not_equal_to,
                "||": bool_or,
                "&&": bool_and
            };

            this.functions = {
                "random": random,
                "fac": fac,
                "min": Math.min,
                "max": Math.max,
                "pyt": pyt,
                "pow": Math.pow,
                "atan2": Math.atan2
            };
        }

        Parser.parse = function (expr) {
            return new Parser().parse(expr);
        };

        Parser.evaluate = function (expr, variables) {
            return Parser.parse(expr).evaluate(variables);
        };

        Parser.Expression = Expression;

        Parser.values = {
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            asin: Math.asin,
            acos: Math.acos,
            atan: Math.atan,
            sqrt: Math.sqrt,
            log: Math.log,
            abs: Math.abs,
            ceil: Math.ceil,
            floor: Math.floor,
            random: random,
            fac: fac,
            exp: Math.exp,
            min: Math.min,
            max: Math.max,
            pyt: pyt,
            pow: Math.pow,
            atan2: Math.atan2
        };

        var PRIMARY      = 1 << 0;
        var OPERATOR     = 1 << 1;
        var FUNCTION     = 1 << 2;
        var LPAREN       = 1 << 3;
        var RPAREN       = 1 << 4;
        var COMMA        = 1 << 5;
        var SIGN         = 1 << 6;
        var CALL         = 1 << 7;
        var NULLARY_CALL = 1 << 8;

        Parser.prototype = {
            parse: function (expr) {
                this.errormsg = "";
                this.success = true;
                var operstack = [];
                var tokenstack = [];
                this.tmpprio = 0;
                var expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
                var noperators = 0;
                this.expression = expr;
                this.pos = 0;

                while (this.pos < this.expression.length) {
                    if (this.isOperator()) {
                        if (this.isSign() && (expected & SIGN)) {
                            if (this.isNegativeSign()) {
                                this.tokenprio = 9;
                                this.tokenindex = "-";
                                noperators++;
                                this.addfunc(tokenstack, operstack, TOP1);
                            }
                            else if(this.isNegationSign()){
                                this.tokenprio = 9;
                                this.tokenindex = "!";
                                noperators++;
                                this.addfunc(tokenstack, operstack, TOP1);                        
                            }
                            expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
                        }
                        else if (this.isComment()) {

                        }
                        else {
                            if ((expected & OPERATOR) === 0) {
                                this.error_parsing(this.pos, "unexpected operator");
                            }
                            noperators += 2;
                            this.addfunc(tokenstack, operstack, TOP2);
                            expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
                        }
                    }
                    else if (this.isNumber()) {
                        if ((expected & PRIMARY) === 0) {
                            this.error_parsing(this.pos, "unexpected number");
                        }
                        var token = new Token(TNUMBER, 0, 0, this.tokennumber);
                        tokenstack.push(token);

                        expected = (OPERATOR | RPAREN | COMMA);
                    }
                    else if (this.isString()) {
                        if ((expected & PRIMARY) === 0) {
                            this.error_parsing(this.pos, "unexpected string");
                        }
                        var token = new Token(TNUMBER, 0, 0, this.tokennumber);
                        tokenstack.push(token);

                        expected = (OPERATOR | RPAREN | COMMA);
                    }
                    else if (this.isLeftParenth()) {
                        if ((expected & LPAREN) === 0) {
                            this.error_parsing(this.pos, "unexpected \"(\"");
                        }

                        if (expected & CALL) {
                            noperators += 2;
                            this.tokenprio = 1;
                            this.tokenindex = -1;
                            this.addfunc(tokenstack, operstack, TFUNCALL);
                        }

                        expected = (PRIMARY | LPAREN | FUNCTION | SIGN | NULLARY_CALL);
                    }
                    else if (this.isRightParenth()) {
                        if (expected & NULLARY_CALL) {
                            var token = new Token(TNUMBER, 0, 0, []);
                            tokenstack.push(token);
                        }
                        else if ((expected & RPAREN) === 0) {
                            this.error_parsing(this.pos, "unexpected \")\"");
                        }

                        expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
                    }
                    else if (this.isComma()) {
                        if ((expected & COMMA) === 0) {
                            this.error_parsing(this.pos, "unexpected \",\"");
                        }
                        this.addfunc(tokenstack, operstack, TOP2);
                        noperators += 2;
                        expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
                    }
                    else if (this.isOp2()) {
                        if ((expected & FUNCTION) === 0) {
                            this.error_parsing(this.pos, "unexpected function");
                        }
                        this.addfunc(tokenstack, operstack, TOP2);
                        noperators += 2;
                        expected = (LPAREN);
                    }
                    else if (this.isOp1()) {
                        if ((expected & FUNCTION) === 0) {
                            this.error_parsing(this.pos, "unexpected function");
                        }
                        this.addfunc(tokenstack, operstack, TOP1);
                        noperators++;
                        expected = (LPAREN);
                    }
                    else if (this.isVar()) {
                        if ((expected & PRIMARY) === 0) {
                            this.error_parsing(this.pos, "unexpected variable");
                        }
                        var vartoken = new Token(TVAR, this.tokenindex, 0, 0);
                        tokenstack.push(vartoken);

                        expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
                    }
                    else if (this.isWhite()) {
                    }
                    else {
                        if (this.errormsg === "") {
                            this.error_parsing(this.pos, "unknown character ");
                        }
                        else {
                            this.error_parsing(this.pos, this.errormsg);
                        }
                    }
                }
                if (this.tmpprio < 0 || this.tmpprio >= 10) {
                    this.error_parsing(this.pos, "unmatched \"()\"");
                }
                while (operstack.length > 0) {
                    var tmp = operstack.pop();
                    tokenstack.push(tmp);
                }
                if (noperators + 1 !== tokenstack.length) {
                    //print(noperators + 1);
                    //print(tokenstack);
                    this.error_parsing(this.pos, "parity");
                }

                return new Expression(tokenstack, object(this.ops1), object(this.ops2), object(this.functions));
            },

            evaluate: function (expr, variables) {
                return this.parse(expr).evaluate(variables);
            },

            error_parsing: function (column, msg) {
                this.success = false;
                this.errormsg = "parse error [column " + (column) + "]: " + msg;
                throw new Error(this.errormsg);
            },

    //\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\

            addfunc: function (tokenstack, operstack, type_) {
                var operator = new Token(type_, this.tokenindex, this.tokenprio + this.tmpprio, 0);
                while (operstack.length > 0) {
                    if (operator.prio_ <= operstack[operstack.length - 1].prio_) {
                        tokenstack.push(operstack.pop());
                    }
                    else {
                        break;
                    }
                }
                operstack.push(operator);
            },

            isNumber: function () {
                var r = false;
                var str = "";
                while (this.pos < this.expression.length) {
                    var code = this.expression.charCodeAt(this.pos);
                    if ((code >= 48 && code <= 57) || code === 46) {
                        str += this.expression.charAt(this.pos);
                        this.pos++;
                        this.tokennumber = parseFloat(str);
                        r = true;
                    }
                    else {
                        break;
                    }
                }
                return r;
            },

            // Ported from the yajjl JSON parser at http://code.google.com/p/yajjl/
            unescape: function(v, pos) {
                var buffer = [];
                var escaping = false;

                for (var i = 0; i < v.length; i++) {
                    var c = v.charAt(i);
        
                    if (escaping) {
                        switch (c) {
                        case "'":
                            buffer.push("'");
                            break;
                        case '\\':
                            buffer.push('\\');
                            break;
                        case '/':
                            buffer.push('/');
                            break;
                        case 'b':
                            buffer.push('\b');
                            break;
                        case 'f':
                            buffer.push('\f');
                            break;
                        case 'n':
                            buffer.push('\n');
                            break;
                        case 'r':
                            buffer.push('\r');
                            break;
                        case 't':
                            buffer.push('\t');
                            break;
                        case 'u':
                            // interpret the following 4 characters as the hex of the unicode code point
                            var codePoint = parseInt(v.substring(i + 1, i + 5), 16);
                            buffer.push(String.fromCharCode(codePoint));
                            i += 4;
                            break;
                        default:
                            throw this.error_parsing(pos + i, "Illegal escape sequence: '\\" + c + "'");
                        }
                        escaping = false;
                    } else {
                        if (c == '\\') {
                            escaping = true;
                        } else {
                            buffer.push(c);
                        }
                    }
                }
        
                return buffer.join('');
            },
            isQuote:function()
            {
                return (this.expression.charAt(this.pos) == "'" ||
                        this.expression.charAt(this.pos) == "\"") ? true:false;
            },
            isString: function () {
                var r = false;
                var str = "";
                var startpos = this.pos;
                if (this.pos < this.expression.length && this.isQuote()) {
                    var cQuoteChar = this.expression.charAt(this.pos);
                    this.pos++;
                    while (this.pos < this.expression.length) {
                        var code = this.expression.charAt(this.pos);
                        if (code != cQuoteChar || str.slice(-1) == "\\") {
                            str += this.expression.charAt(this.pos);
                            this.pos++;
                        }
                        else {
                            this.pos++;
                            this.tokennumber = this.unescape(str, startpos);
                            r = true;
                            break;
                        }
                    }
                }
                return r;
            },

            isOperator: function () {
                var code = this.expression.charCodeAt(this.pos);
                if (code === 43) { // +
                    this.tokenprio = 7;
                    this.tokenindex = "+";
                }
                else if (code === 45) { // -
                    this.tokenprio = 7;
                    this.tokenindex = "-";
                }
                else if (code === 42) { // *
                    this.tokenprio = 8;
                    this.tokenindex = "*";
                }
                else if (code === 47) { // /
                    this.tokenprio = 8;
                    this.tokenindex = "/";
                }
                else if (code === 37) { // %
                    this.tokenprio = 8;
                    this.tokenindex = "%";
                }
                else if (code === 94) { // ^
                    this.tokenprio = 10;
                    this.tokenindex = "^";
                }
                else if (code === 60) { // <
                    if (this.expression.charCodeAt(this.pos + 1) === 61) { //=
                        this.pos++;
                        this.tokenprio = 6;
                        this.tokenindex = "<=";
                    }
                    else {
                        this.tokenprio = 6;
                        this.tokenindex = "<";
                    }
                }
                else if (code === 62) {//>
                    if (this.expression.charCodeAt(this.pos + 1) === 61) { //=
                        this.pos++;
                        this.tokenprio = 6;
                        this.tokenindex = ">=";
                    }
                    else {
                        this.tokenprio = 6;
                        this.tokenindex = ">";
                    }            
                }            
                else if (code === 61) {//=
                    if (this.expression.charCodeAt(this.pos + 1) === 61) { //=
                        this.pos++;
                        this.tokenprio = 5;
                        this.tokenindex = "==";
                    }
                    else {
                        return false;
                    }                
                }
                else if (code === 33) {//!
                    if (this.expression.charCodeAt(this.pos + 1) === 61) { //=
                        this.pos++;
                        this.tokenprio = 5;
                        this.tokenindex = "!=";
                    }
                    else {
                        this.tokenprio = 9;
                        this.tokenindex = "!";
                    }                
                }
                else if (code === 124) { // |
                    if (this.expression.charCodeAt(this.pos + 1) === 124) {
                        this.pos++;
                        this.tokenprio = 3;
                        this.tokenindex = "||";
                    }
                    else {
                        return false;
                    }
                }
                else if (code === 38) { // &
                    if (this.expression.charCodeAt(this.pos + 1) === 38) {
                        this.pos++;
                        this.tokenprio = 4;
                        this.tokenindex = "&&";
                    }
                    else {
                        return false;
                    }
                }            
                else {
                    return false;
                }
                this.pos++;
                return true;
            },

            isSign: function () {
                var code = this.expression.charCodeAt(this.pos - 1);
                if (code === 45 || code === 43 || code === 33) { // - + !
                    return true;
                }
                return false;
            },

            isPositiveSign: function () {
                var code = this.expression.charCodeAt(this.pos - 1);
                if (code === 43) { // -
                    return true;
                }
                return false;
            },

            isNegativeSign: function () {
                var code = this.expression.charCodeAt(this.pos - 1);
                if (code === 45) { // -
                    return true;
                }
                return false;
            },
            
            isNegationSign: function () {
                var code = this.expression.charCodeAt(this.pos - 1);
                if (code === 33) { // !
                    return true;
                }
                return false;
            },
            isLeftParenth: function () {
                var code = this.expression.charCodeAt(this.pos);
                if (code === 40 || code === 91) { // ( or [
                    this.pos++;
                    this.tmpprio += 10;
                    return true;
                }
                return false;
            },

            isRightParenth: function () {
                var code = this.expression.charCodeAt(this.pos);
                if (code === 41 || code === 93) { // ) or ]
                    this.pos++;
                    this.tmpprio -= 10;
                    return true;
                }
                return false;
            },

            isComma: function () {
                var code = this.expression.charCodeAt(this.pos);
                if (code === 44) { // ,
                    this.pos++;
                    this.tokenprio = 2;
                    this.tokenindex = ",";
                    return true;
                }
                return false;
            },

            isWhite: function () {
                var code = this.expression.charCodeAt(this.pos);
                if (code === 32 || code === 9 || code === 10 || code === 13) {
                    this.pos++;
                    return true;
                }
                return false;
            },

            isOp1: function () {
                var str = "";
                for (var i = this.pos; i < this.expression.length; i++) {
                    var c = this.expression.charAt(i);
                    if (c.toUpperCase() === c.toLowerCase()) {
                        if (i === this.pos || (c != '_' && (c < '0' || c > '9'))) {
                            break;
                        }
                    }
                    str += c;
                }
                if (str.length > 0 && (str in this.ops1)) {
                    this.tokenindex = str;
                    this.tokenprio = 12;
                    this.pos += str.length;
                    return true;
                }
                return false;
            },

            isOp2: function () {
                var str = "";
                for (var i = this.pos; i < this.expression.length; i++) {
                    var c = this.expression.charAt(i);
                    if (c.toUpperCase() === c.toLowerCase()) {
                        if (i === this.pos || (c != '_' && (c < '0' || c > '9'))) {
                            break;
                        }
                    }
                    str += c;
                }
                if (str.length > 0 && (str in this.ops2)) {
                    this.tokenindex = str;
                    this.tokenprio = 12;
                    this.pos += str.length;
                    return true;
                }
                return false;
            },

            isVar: function () {
                var str = "";
                for (var i = this.pos; i < this.expression.length; i++) {
                    var c = this.expression.charAt(i);
                    if (c.toUpperCase() === c.toLowerCase()) {
                        if (i === this.pos || (c != '_' && (c < '0' || c > '9'))) {
                            break;
                        }
                    }
                    str += c;
                }
                if (str.length > 0) {
                    this.tokenindex = str;
                    this.tokenprio = 11;
                    this.pos += str.length;
                    return true;
                }
                return false;
            },

            isComment: function () {
                var code = this.expression.charCodeAt(this.pos - 1);
                if (code === 47 && this.expression.charCodeAt(this.pos) === 42) {
                    this.pos = this.expression.indexOf("*/", this.pos) + 2;
                    if (this.pos === 1) {
                        this.pos = this.expression.length;
                    }
                    return true;
                }
                return false;
            }
        };

        scope.Parser = Parser;
        return Parser
    })(typeof exports === 'undefined' ? {} : exports);
    
    function sfm_simple_format_number(num)
    {
        var the_num = convfx.getNumber(num);

        if(isNaN(the_num)) 
        { 
            the_num = 0; 
        }
        var local_num = the_num.toString().replace('.',Globalize.culture().numberFormat['.']);
        return local_num;
    }    
    
    function sfm_format_currency(amount,add_comma,symbol)
    {
        var the_num = convfx.getNumber(amount);

        if(isNaN(the_num)) 
        { 
            the_num = 0.00; 
        }
        return Globalize.format(the_num,'c');
    }
})(jQuery);

