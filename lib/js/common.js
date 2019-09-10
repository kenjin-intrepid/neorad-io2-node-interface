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

    if(settings.get("theme") && settings.get("theme") == "1")
    {
        $('#theme_select option[value="1"]').prop('selected',true);
        $('.main_area').addClass('theme-black-bg');
        $('#modal_set').addClass('theme-grey-bg');
        $('#modal_about').addClass('theme-grey-bg');
        plot_bg_color = "#000";
        plot_font_color = "#fff";
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
$('.nav_device').on('click', () => {
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

$('.nav_calibration').on('click', () => {
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
            $(alerthtml).html(`${alert_template('Invalid ID')}`);
        }
    }

    if(type == "4")
    {
        if(hex > 0x3FFFFFFF)
        {
            $(alerthtml).html(`${alert_template('Invalid ID')}`);
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

$('.ma_device').on('change','.ma_device_can_mode',function () {
    if($(this).val() == "1")
    {
        $(this).parents('td').find('.ma_device_can_type').prop("disabled",true);
        $(this).parents('td').find('.ma_device_can_id_type').prop("disabled",true);
        $(this).parents('td').find('.ma_device_can_id').prop("disabled",true);
        $(this).parents('td').find('.ma_device_can_byte').prop("disabled",true);
    }
    else if($(this).val() == "0")
    {
        $(this).parents('td').find('.ma_device_can_type').prop("disabled",false);
        $(this).parents('td').find('.ma_device_can_id_type').prop("disabled",false);
        $(this).parents('td').find('.ma_device_can_id').prop("disabled",false);
        $(this).parents('td').find('.ma_device_can_byte').prop("disabled",false);
    }
});

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
                        $(alerthtml).html(`${alert_template('Invalid value')}`);
                    }
                }
            }
            else if(type == "2")
            {
                if(Math.abs(value - byte_array_value) < 64)
                {
                    if($(this)[0] !== $(this).parents('tr').find('.ma_device_can_byte')[i])
                    {
                        $(alerthtml).html(`${alert_template('Invalid value')}`);
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
    let theme = $('#theme_select').val();
    settings.set('locale', language);
    settings.set('tempUnit',temperature);
    settings.set('rate',rate);
    settings.set('plot',plot);
    settings.set('cal',cal);
    settings.set('save',save);
    settings.set('theme',theme);
    $('#modal_set').modal('hide');

    if(cal == 1)
    {
        $('.nav_calibration').removeClass('hidden');
    }
    else if(cal == 0)
    {
        $('.nav_calibration').addClass('hidden');
    }

    if(theme == 1)
    {
        $('.main_area').addClass('theme-black-bg');
        $('#modal_set').addClass('theme-grey-bg');
        $('#modal_about').addClass('theme-grey-bg');
        plot_bg_color = "#000";
        plot_font_color = "#fff";
    }
    else if(theme == 0)
    {
        $('.main_area').removeClass('theme-black-bg');
        $('#modal_set').removeClass('theme-grey-bg');
        $('#modal_about').removeClass('theme-grey-bg');
        plot_bg_color = "#fff";
        plot_font_color = "#000";
    }
}

function cancelModal() {
    let language = "en", temperature = 0, rate = 100, plot = 1, cal = 0, save = 0, theme = 0;

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
    if(settings.get('theme'))
    {
        theme = settings.get('theme');
    }

    $(`#language_select option[value="${language}"]`).prop('selected',true);
    $(`#temp_select option[value="${temperature}"]`).prop('selected',true);
    $(`#push_rate option[value="${rate}"]`).prop('selected',true);
    $(`#plot_load option[value="${plot}"]`).prop('selected',true);
    $(`#cal_select option[value="${cal}"]`).prop('selected',true);
    $(`#auto_save option[value="${save}"]`).prop('selected',true);
    $(`#theme_select option[value="${theme}"]`).prop('selected',true);
}

function openFolder() {
    let Path = path.join(mypath, `IntrepidCS\/neoRAD-IO2`);
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
    $('.navbar_items').hide();
    $('.statustext').html(`<span>${str}</span>`);
    $('.statustext span').delay(timer).fadeOut(1000,function () {
        $('.navbar_items').show();
    });
}