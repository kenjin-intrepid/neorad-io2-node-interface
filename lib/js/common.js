$(document).ready(() => {
    let rate = settings.get('rate');
    refreshRate = rate;
    if(rate == 100 || rate == 200 || rate == 1000 || rate == 2000 || rate == 5000)
    {
        $(`#push_rate option[value="${rate}"]`).prop('selected',true)
    }

    if(settings.get("tempUnit") && settings.get("tempUnit") == 1)
    {
        $('#temp_select option[value="1"]').prop('selected',true);
    }

    if(settings.get("plot") && settings.get("plot") == 0)
    {
        $('#plot_load option[value="0"]').prop('selected',true);
    }

    if(settings.get("cal") && settings.get("cal") == 1)
    {
        $('#cal_select option[value="1"]').prop('selected',true);
        $('.nav_calibration').removeClass('hidden');
    }

    if(settings.get("save") && settings.get("save") == "1")
    {
        $('#auto_save option[value="1"]').prop('selected',true);
    }

    if(settings.get("theme") == 2)
    {
        $('.main_area').addClass('theme-black-bg');
        $('#modal_set').addClass('theme-grey-bg');
        $('#modal_about').addClass('theme-grey-bg');
        $('.nav-theme .fa-moon').removeClass('hidden');
        plot_bg_color = "#000";
        plot_font_color = "#fff";
    }
    else
    {
        $('.nav-theme .fa-sun').removeClass('hidden');
        if(!settings.get("theme"))
        {
            settings.set("theme", 1);
        }
    }

    const markdowndata = require('../js/help');
    let locale = settings.get('locale');
    if(!locale)
    {
        locale = "en";
    }
    $("#ma_info").html(markdowndata[locale]);

    $(document).on('visibilitychange', function()
    {
        if(document.visibilityState == 'hidden')
        {
            console.log('hidden');
        }
        else
        {
            console.log('showing');
        }
    });
});

// environment control-----------------------------------------
$(document).on('click','a[href^="http"]', function (e){
    e.preventDefault();
    Shell.openExternal(this.href);
});

//listen to user drag and drop files and parse the dropped file
document.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
});

//preventing user from dragging text over
document.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
});
// environment control end-------------------------------------

// tab view change
$('.nav_device').on('click',() => {
    $('.ma').addClass('hidden');
    $('.nav-item').removeClass('active');
    $('.nav_device').addClass('active');
    $('.ma_device').removeClass('hidden');
});

$('.nav_graph').on('click',() => {
    $('.ma').addClass('hidden');
    $('.nav-item').removeClass('active');
    $('.nav_graph').addClass('active');
    $('.ma_graph').removeClass('hidden');

    if(!plotlyInit)
    {
        resizePlot();
    }
});

$('.nav_info').on('click',() => {
    $('.ma').addClass('hidden');
    $('.nav-item').removeClass('active');
    $('.nav_info').addClass('active');
    $('.ma_info').removeClass('hidden');
});

$('.nav_calibration').on('click',() => {
    $('.ma').addClass('hidden');
    $('.nav-item').removeClass('active');
    $('.nav_calibration').addClass('active');
    $('.ma_calibration').removeClass('hidden');
});

$('.nav_setting').on('click',() => {
    $('#modal_set').modal({
        keyboard: false
    });
});

$('.nav-theme').on('click',function() {
    if(settings.get("theme") && settings.get("theme") == 1)
    {
        $('.main_area').addClass('theme-black-bg');
        $('#modal_set').addClass('theme-grey-bg');
        $('#modal_about').addClass('theme-grey-bg');
        plot_bg_color = "#000";
        plot_font_color = "#fff";
        $('.nav-theme .fa-moon').removeClass('hidden');
        $('.nav-theme .fa-sun').addClass('hidden');
        settings.set('theme', 2);
    }
    else if(settings.get("theme") && settings.get("theme") == 2)
    {
        $('.main_area').removeClass('theme-black-bg');
        $('#modal_set').removeClass('theme-grey-bg');
        $('#modal_about').removeClass('theme-grey-bg');
        plot_bg_color = "#fff";
        plot_font_color = "#000";
        $('.nav-theme .fa-moon').addClass('hidden');
        $('.nav-theme .fa-sun').removeClass('hidden');
        settings.set('theme', 1);
    }
    $(this).find('.nav-link').blur();
});

function clickEffect(){
    this.classList.add('cbutton-click');
    this.addEventListener('animationend', function () {
        this.classList.remove('cbutton-click');
    });
}

const cbutton = document.querySelectorAll(".cbutton");
[...cbutton].forEach(arg => arg.addEventListener('click',clickEffect));

function closeWindow() {
    app.getCurrentWindow().close();
}

ipcRenderer.on('about', function() {
    $('#modal_about').modal({
        keyboard: false
    });
});

ipcRenderer.on('device', function() {
    $('.nav_device').click();
});

ipcRenderer.on('graph', function() {
    $('.nav_graph').click();
});

ipcRenderer.on('help', function() {
    $('.nav_info').click();
});

ipcRenderer.on('setting', function() {
    $('.nav_setting').click();
});

$('.ma_device').on('change','.device_check_pullrate_select',function () {
    if($(this).val() == 0)
    {
        $(this).next().find('input').prop('disabled', false);
        $(this).next().removeClass('opacity');
    }
    else
    {
        $(this).next().find('input').prop('disabled', true);
        $(this).next().find('input').val($(this).val());
        $(this).next().addClass('opacity');
    }
});

$('.ma_device').on('change','.neorad_ain_sample_input',function () {
    if($(this).val() == "low")
    {
        $(this).parents('.neorad_ain_sample').find(`.ain_low_select`).removeClass('hidden');
        $(this).parents('.neorad_ain_sample').find(`.ain_high_select`).addClass('hidden');
    }
    else if($(this).val() == "high")
    {
        $(this).parents('.neorad_ain_sample').find(`.ain_low_select`).addClass('hidden');
        $(this).parents('.neorad_ain_sample').find(`.ain_high_select`).removeClass('hidden');
    }
});


$('.ma_device').on('blur','.ma_device_can_id',function () {
    let hex = parseInt($(this).val(),16).toFixed(0);
    let type = $(this).parents('td').find('.ma_device_can_id_type').val();
    let alerthtml = $(this).parent().find('.can_id_alert');

    if(hex == "NaN")
    {
        console.log('not a number');
        $(alerthtml).html(`${alert_template('Not a number')}`);
    }

    if(type == "3")
    {
        if(hex > 0x7FF)
        {
            $(alerthtml).html(`${alert_template('CAN Type incorrect, Try Xtd')}`);
        }
    }

    if(type == "4")
    {
        if(hex > 0x3FFFFFFF)
        {
            $(alerthtml).html(`${alert_template('CAN Value too large')}`);
        }
    }

    setTimeout(function () {
        $(alerthtml).html("");
    },3000);
    can_validation();
});

$('.ma_device').on('change','.ma_device_can_type',function () {
    $(this).parents('td').find('.can_id_alert').html('');
    $(this).parents('tr').find('.ma_device_can_type').val($(this).val());
});

// $('.ma_device').on('change','.ma_device_can_mode',function () {
//     if($(this).val() == "1")
//     {
//         $(this).parents('td').find('.ma_device_can_type').prop("disabled",true);
//         $(this).parents('td').find('.ma_device_can_id_type').prop("disabled",true);
//         $(this).parents('td').find('.ma_device_can_id').prop("disabled",true);
//         $(this).parents('td').find('.ma_device_can_byte').prop("disabled",true);
//     }
//     else if($(this).val() == "0")
//     {
//         $(this).parents('td').find('.ma_device_can_type').prop("disabled",false);
//         $(this).parents('td').find('.ma_device_can_id_type').prop("disabled",false);
//         $(this).parents('td').find('.ma_device_can_id').prop("disabled",false);
//         $(this).parents('td').find('.ma_device_can_byte').prop("disabled",false);
//     }
// });

$('.ma_device').on('blur','.ma_device_can_byte',function () {
    let value = parseInt($(this).val()).toFixed(0);
    let type = $(this).parents('td').find('.ma_device_can_type').val();
    let canid = parseInt($(this).parents('td').find('.ma_device_can_id').val(),16);
    let alerthtml = $(this).parent().find('.byte_id_alert');
    let canid_array_length = $(this).parents('tr').find('.ma_device_can_id').length;

    for(let i = 0; i < canid_array_length; i++)
    {
        let canid_array_value = parseInt($($(this).parents('tr').find('.ma_device_can_id')[i]).val(),16);
        let byte_array_value = parseInt($($(this).parents('tr').find('.ma_device_can_byte')[i]).val());

        if(canid == canid_array_value)
        {
            if(type == "1")
            {
                if(Math.abs(value - byte_array_value) < 4)
                {
                    if($(this)[0] !== $(this).parents('tr').find('.ma_device_can_byte')[i])
                    {
                        $(alerthtml).html(`${alert_template('CAN ID Overlap')}`);
                    }
                }
            }
            else if(type == "2")
            {
                if(Math.abs(value - byte_array_value) < 64)
                {
                    if($(this)[0] !== $(this).parents('tr').find('.ma_device_can_byte')[i])
                    {
                        $(alerthtml).html(`${alert_template('CAN ID Overlap')}`);
                    }
                }
            }
        }
    }

    setTimeout(function () {
        $(alerthtml).html("");
    },3000);
});

$('#device_serial').on('change',function () {
    switch ($(this).val()) {
        case "0":
            $(this).parent('.sidepanel_input_group').next('.cal_ain_range').addClass('hidden');
            break;
        case "2":
            $(this).parent('.sidepanel_input_group').next('.cal_ain_range').addClass('hidden');
            break;
        case "3":
            $(this).parent('.sidepanel_input_group').next('.cal_ain_range').removeClass('hidden');
            break;
    }
});

function closeModal() {
    let language = $('#language_select').val();
    let temperature = $('#temp_select').val();
    let rate = $('#push_rate').val();
    let plot = $('#plot_load').val();
    let cal = $('#cal_select').val();
    let save = $('#auto_save').val();
    settings.set('locale', language);
    settings.set('tempUnit',temperature);
    settings.set('rate',rate);
    settings.set('plot',plot);
    settings.set('cal',cal);
    settings.set('save',save);
    $('#modal_set').modal('hide');

    if(cal == 1)
    {
        $('.nav_calibration').removeClass('hidden');
    }
    else if(cal == 0)
    {
        $('.nav_calibration').addClass('hidden');
    }
}

function cancelModal() {
    let language = "en", temperature = 0, rate = 100, plot = 1, cal = 0, save = 0;

    if(settings.get('locale'))
    {
        language = settings.get('locale');
    }
    if(settings.get('tempUnit'))
    {
        temperature = settings.get('tempUnit');
    }
    if(settings.get('rate'))
    {
        rate = settings.get('rate');
    }
    if(settings.get('plot'))
    {
        plot = settings.get('plot');
    }
    if(settings.get('cal'))
    {
        cal = settings.get('cal');
    }
    if(settings.get('save'))
    {
        save = settings.get('save');
    }

    $(`#language_select option[value="${language}"]`).prop('selected',true);
    $(`#temp_select option[value="${temperature}"]`).prop('selected',true);
    $(`#push_rate option[value="${rate}"]`).prop('selected',true);
    $(`#plot_load option[value="${plot}"]`).prop('selected',true);
    $(`#cal_select option[value="${cal}"]`).prop('selected',true);
    $(`#auto_save option[value="${save}"]`).prop('selected',true);
}

function openFolder() {
    let Path = path.join(mypath, `IntrepidCS\/RAD-IO2`);
    Shell.showItemInFolder(Path);
}

function Dialog(type) {
    dialog.showMessageBox({
        type:"warning",
        buttons:[template[Locale]['reload_ok']],
        message: template[Locale][`${type}`]
    });
}

function can_validation() {
    let max_device = globalObj.device_found.maxID_Device;
    for(let i = 0; i < max_device; i++)
    {
        let id_node = Array.from($(`.device${i} .ma_device_can_id`));
        let byte_node = Array.from($(`.device${i} .ma_device_can_byte`));
        let id_node_length = id_node.length;
        for(let j = 0; j < id_node_length; j++)
        {
            for(let k = 0; k < id_node_length; k++){
                if(id_node[j].value != 0)
                {
                    if(id_node[j].value == id_node[k].value)
                    {
                        if(byte_node[j] - byte_node[k] < 4 && byte_node[k] - byte_node[j] < 4){
                            console.log("overlap error");
                        }
                    }
                }
            }
        }
    }
}

function change_status_text(str,timer) {
    if(!timer)
    {
        timer = 3000;
    }
    $('.statustext').removeClass('hidden');
    $('.statustext').html(`<span>${str}</span>`);
    $('.statustext span').delay(timer).fadeOut(1000,function ()
    {
        $('.statustext').addClass('hidden');
    });
}

let prev_timer;
function change_error_text(str, timer) {
    $('.errortext').removeClass('hidden');
    $('.errortext').html(`<span>${str}</span>`);
    clearTimeout(prev_timer);
    if(timer)
    {
        $('.errortext span').delay(timer).fadeOut(1000,function ()
        {
            $('.errortext').addClass('hidden');
        });
    }
    else
    {
        prev_timer = setTimeout(function ()
        {
            $(document).on('click',function ()
            {
                $('.errortext span').fadeOut(1000,function ()
                {
                    $(document).off();
                    $('.errortext').addClass('hidden');
                });
            })
        },1000);
    }
}

function auto_fill_error_text(str)
{
    $('.autofill_errortext').html(`<span>${str}</span>`);
    $('.autofill_errortext span').delay(3000).fadeOut(1000);
}

$('.ma_device').on('click','.ma_device_table_tab1',function(){
    $(this).parents('.ma_device_wrap').find('.table1').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table2').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table3').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table4').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab2').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab3').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab4').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).removeClass('ma_device_table_head_inv').addClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.device_save').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.device_default').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.can_export').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.set_export').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.set_import').addClass('hidden');
});

$('.ma_device').on('click','.ma_device_table_tab2',function(){
    $(this).parents('.ma_device_wrap').find('.table2').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table1').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table3').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table4').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab1').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab3').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab4').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).removeClass('ma_device_table_head_inv').addClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.device_save').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.device_default').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.can_export').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.set_export').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.set_import').removeClass('hidden');

    $('.set_import').tooltip();
    $('.set_export').tooltip();
    $('.device_save').tooltip();
    $('.device_default').tooltip();
});

$('.ma_device').on('click','.ma_device_table_tab3',function(){
    $(this).parents('.ma_device_wrap').find('.table3').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table1').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table2').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table4').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab1').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab2').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab4').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).removeClass('ma_device_table_head_inv').addClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.device_save').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.device_default').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.can_export').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.set_export').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.set_import').removeClass('hidden');

    $('.set_import').tooltip();
    $('.set_export').tooltip();
    $('.can_export').tooltip();
    $('.device_save').tooltip();
    $('.device_default').tooltip();
});

$('.ma_device').on('click','.ma_device_table_tab4',function(){
    $(this).parents('.ma_device_wrap').find('.table4').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table1').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table2').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table3').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab1').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab2').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab3').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).removeClass('ma_device_table_head_inv').addClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.device_save').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.device_default').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.can_export').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.set_export').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.set_import').addClass('hidden');
});

function lockDIO()
{
    $('.dio_v_trig').prop('disabled',true);
    $('.dio_prescaler').prop('disabled',true);
    $('.dio_mode_select').prop('disabled',true);
    $('.dio_mode_select').prop('disabled',true);
    $('.device_hb_check_status').prop('disabled',true);
    $('.dout_mode_select').prop('disabled',true);
    $('.dout_pwm').prop('disabled',true);
    $('.dout_ch1_select').prop('disabled',true);
    $('.dout_ch2_select').prop('disabled',true);
    $('.ch1_dout_unit_input').prop('disabled',true);
    $('.ch2_dout_unit_input').prop('disabled',true);
}

function unlockDIO()
{
    $('.dio_v_trig').prop('disabled',false);
    $('.dio_prescaler').prop('disabled',false);
    $('.dio_mode_select').prop('disabled',false);
    $('.dio_mode_select').prop('disabled',false);
    $('.device_hb_check_status').prop('disabled',false);
    $('.dout_mode_select').prop('disabled',false);
    $('.dout_pwm').prop('disabled',false);
    $('.dout_ch1_select').prop('disabled',false);
    $('.dout_ch2_select').prop('disabled',false);
    $('.ch1_dout_unit_input').prop('disabled',false);
    $('.ch2_dout_unit_input').prop('disabled',false);
}