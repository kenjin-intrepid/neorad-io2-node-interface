$('.cal_table_tc_tables').on('blur','.cal_me',function () {
    if(isNaN($(this).val()))
    {
        $(this).focus();
        change_error_text("Please enter a correct value");
        return;
    }
    let first = parseFloat($(this).closest('tr').find('.cal_input_th').val());
    let second = parseFloat($(this).val());
    let type = parseInt($('#device_serial option:selected').val());
    let final;
    switch (type) {
        case 0:
            final = parseFloat(first - second).toFixed(1);
            break;
        case 3:
            let range = parseInt($(this).parents('.cal_table_').attr('data-range'));
            if(range < 4)
            {
                final = parseFloat(first - second).toFixed(3);
            }
            else
            {
                final = parseFloat(first - second).toFixed(4);
            }
            break;
        case 4:
            final = parseFloat(first - second).toFixed(4);
            break;
    }

    if(final == "NaN")
    {
        final = 0;
    }
    $(this).next().val(final);
});

$('.cal_table_tc_tables').on('keydown','input',function (ev) {
    if(ev.which > 36 && ev.which < 41)
    {
        ev.preventDefault();
    }
});

$('.cal_table_tc_tables').on('keyup',function (e) {
    let td = $(e.target).closest('td');
    let tr = td.closest('tr');
    let pos = td[0].cellIndex;
    if(e.which === 38) //up
    {
        let moveToRow = tr.prev('tr');
        if (moveToRow.length)
        {
            $(moveToRow[0].cells[pos]).find('input').focus();
        }
    }

    if(e.which === 40) //down
    {
        let moveToRow = tr.next('tr');
        if (moveToRow.length)
        {
            $(moveToRow[0].cells[pos]).find('input').focus();
        }
    }

    if(e.which === 37) //left
    {
        $(e.target).closest('td').prev().find('input').focus();
    }

    if(e.which === 39) //right
    {
        $(e.target).closest('td').next().find('input').focus();
    }
});

$('.cal_table_tc_tables').on('keyup','.cal_input_th',function (e) {
    if(e.which === 13)
    {
        organize();
        $(`.cal_input_th[value="${$(this).val()}"]`).focus();
    }
});

$(".cal_table_tc_tables").on("focus",".cal_input, .cal_input_th", function () {
    $(this).select();
});

$(".cal_ain_range .ain_select").on("change",function () {
    let AIN_range = parseInt($('.cal_ain_range').find('.ain_select').val());
    $('.cal_table_').addClass("hidden");
    $(`#cal_table_${AIN_range}`).removeClass("hidden");
    organize();
});


function difference() {
    $('.cal_diff').each(function (index, elem) {
        let first = parseFloat($(elem).closest('tr').find('.cal_input_th').val());
        let second = parseFloat($(elem).prev().val());
        let type = parseInt($('#device_serial option:selected').val());
        let final;
        switch (type) {
            case 0:
                final = parseFloat(first - second).toFixed(1);
                break;
            case 3:
                let range = parseInt($(elem).parents('.cal_table_').attr('data-range'));
                if(range < 4)
                {
                    final = parseFloat(first - second).toFixed(3);
                }
                else
                {
                    final = parseFloat(first - second).toFixed(4);
                }
                break;
            case 4:
                final = parseFloat(first - second).toFixed(4);
                break;
        }

        if(final == "NaN")
        {
            final = 0;
        }
        $(elem).val(final);
    })
}

function addRow(Parent) {
    Parent += 1; //table starts at 1
    let parent = $(`.cal_table_tc_tables #cal_table_${Parent}`);
    let row = $(`#cal_table_${Parent} .cal_input_th`).length;

    if(row > 10)
    {
        change_error_text("Maximum points reached");
        return;
    }

    switch ($('#device_serial').val())
    {
        case "0" :
            $($(parent).find('tbody')).append(`${cal_row_temp($('#device_serial option:selected').val(),null,null, addRow.caller.name, null)}`);
            break;
        case "3" :
            $($(parent).find('tbody')).append(`${cal_row_temp($('#device_serial option:selected').val(),null,null, addRow.caller.name, null)}`);
            break;
        default:
            break;
    }

    $(`#cal_table_${Parent} .cal_input_th`).focus();
    $('.ma_calibration').scrollTop($(document).height());
}

function addRowAout(Parent) {
    let parent = $(`.cal_table_tc_tables #cal_table_${Parent}`);
    let row = $(`#cal_table_${Parent} .cal_input_th`).length;

    if(row > 10)
    {
        change_error_text("Maximum points reached");
        return;
    }

    $($(parent).find('tbody')).append(`${cal_row_aout_temp($('#device_serial option:selected').val(),null,null, addRowAout.caller.name)}`);
}

function editRow() {
    let parent = $('.cal_table_tc_tables');
    if(parent.length > 0)
    {
        $(parent).find('i').toggleClass('hidden');
        $('#addButton').prop('disabled', !$('#addButton').prop('disabled'));
        if($("#removeButton").attr('data-toggle') == "edit")
        {
            $('#removeButton').text(def_lang.cal_cancel);
            $("#removeButton").attr('data-toggle','cancel');
            $('.ma_calibration .cal_input_th').prop('disabled',false);
        }
        else
        {
            $('#removeButton').text(def_lang.cal_remove);
            $("#removeButton").attr('data-toggle','edit');
            $('.ma_calibration .cal_input_th').prop('disabled',true);
        }
    }
}

function organize() {
    $('#addButton').prop('disabled', true);
    $('#removeButton').prop('disabled', true);
    let parent = $('.cal_table_tc_tables .cal_table_:not(.hidden)');
    if(parent.length > 0)
    {
        $(".cal_table_:not(.hidden) .cal_input_th").each(function (index,element) {
            $(element).attr('value',$(element).val());
        });

        $(".cal_table_:not(.hidden) .cal_input").each(function (index,element) {
            $(element).attr('value',$(element).val());
        });

        let tempA = Array.from($(".cal_table_:not(.hidden) .cal_input_th")).sort((a, b) => {
            let A = $(a).val();
            let B = $(b).val();
            if ((A - B) === 0)
            {
                $(b).remove();
            }
            return A - B;
        });

        let nodeList = Array.from(tempA, x => $(x).closest('tr')[0]);
        $('.cal_table_:not(.hidden) tbody').html('');
        nodeList.map(function (value) {
            if(value){
                $('.cal_table_:not(.hidden) tbody').append(`<tr>${$(value).html()}</tr>`);
            }
        });
    }
    $('#addButton').prop('disabled', false);
    $('#removeButton').prop('disabled', false);
}

function deleteRow(that) {
    $(that).parents('tr').remove();
}


function saveJSON() {
    let currentSerial = $('#device_serial option:selected').text();
    let tableOBJ = {};

    if($(".cal_table_tc_tables table").attr('data-type') != $('#device_serial option:selected').val())
    {
        change_error_text('Calibration table incorrect');
        return;
    }

    let tablelength = $(".cal_table_").length;
    for(let i = 0; i < tablelength; i++)
    {
        if(tablelength == 1)
        {
            let rowlength = $(`#cal_table_${i+1} .cal_input_th`).length;
            for(let j = 0; j < rowlength; j++)
            {
                let a = $($(`#cal_table_${i+1} .cal_input_th`)[j]).val();
                let b = $($(`#cal_table_${i+1} .cal_input_th`)[j]).closest('tr').find('td');
                tableOBJ[`${a}`] = {};

                for(let k = 1; k < 9; k++)
                {
                    tableOBJ[`${a}`][`bank${k}`] = parseFloat($(b[k+1]).find('.cal_me').val())
                }
            }
        }
        else
        {
            let rangeNumber = parseInt($($(".cal_table_")[i]).attr('data-range'));
            let rangeTitle = "";
            switch (rangeNumber)
            {
                case 1:
                    rangeTitle = "250mV";
                    break;
                case 2:
                    rangeTitle = "1000mV";
                    break;
                case 3:
                    rangeTitle = "5000mV";
                    break;
                case 4:
                    rangeTitle = "10V";
                    break;
                case 5:
                    rangeTitle = "20V";
                    break;
                case 6:
                    rangeTitle = "45V";
                    break;
            }

            tableOBJ[rangeTitle] = {};
            let rowlength = $(`#cal_table_${i+1} .cal_input_th`).length;
            for(let j = 0; j < rowlength; j++)
            {
                let a = $($(`#cal_table_${i+1} .cal_input_th`)[j]).val();
                if(rangeNumber < 4)
                {
                    a = a / 1000;
                }
                let b = $($(`#cal_table_${i+1} .cal_input_th`)[j]).closest('tr').find('td');
                tableOBJ[rangeTitle][a] = {};

                for(let k = 1; k < 9; k++)
                {
                    let point_value = parseFloat($(b[k+1]).find('.cal_me').val());
                    if(isNaN(point_value))
                    {
                        $(b[k+1]).find('.cal_me').focus();
                        change_error_text('Please enter a correct value');
                        return;
                    }

                    if(rangeNumber < 4)
                    {
                        tableOBJ[rangeTitle][a][`bank${k}`] = point_value  / 1000;
                    }
                    else
                    {
                        tableOBJ[rangeTitle][a][`bank${k}`] = point_value;
                    }
                }
            }
        }
    }

    let saveJSON = {
        serial: currentSerial,
        type: $('#device_serial option:selected').val(),
        data: tableOBJ
    };

    let fileName = saveJSON.serial;
    let myPath = path.join(mypath, `IntrepidCS\/neoRAD-IO2\/${fileName}.json`);

    dialog.showSaveDialog({
        title:'Save JSON',
        defaultPath: myPath,
        filters: [{
            name: 'JSON file',
            extensions: ['json']
        }]
    },(fileName) => {
        if (fileName === undefined || fileName == ""){
            dialog.showMessageBox({
                type:"warning",
                message:"You didn't save the file"
            });
            return;
        }
        fs.writeFile(fileName, JSON.stringify(saveJSON, null, 2), (err) => {
            if (err) throw err;
            dialog.showMessageBox({
                type:"info",
                message:"File saved successfully"
            });
        });
    });

}

function readJSON() {
    let serial = $('#device_serial option:selected').text();
    let myPath = path.join(mypath, `IntrepidCS\/neoRAD-IO2\/${serial}.json`);

    dialog.showOpenDialog({
        title:'Open JSON',
        defaultPath: myPath,
        filters:[{name:'JSON file', extensions: ['json','JSON']}],
        properties:['openFile']
    }, (fileNames)=>{
        if (fileNames === undefined || fileNames == "")
        {
            return;
        }
        let fileName = fileNames[0];
        let dataObj = "";
        fs.readFile(fileName, 'utf8', function (err, data) {
            if (err) throw err;
            dataObj = JSON.parse(data);
            if(dataObj["serial"] != serial)
            {
                change_error_text('Serial different from file');
                return
            }

            let data_stream = {
                type:parseInt(dataObj["type"]),
            };

            switch (data_stream.type) {
                case 0:
                    data_stream["data"] = {0:{}};
                    data_stream["data"][0]['calpoints'] = [];
                    data_stream["data"][0]['datapoints'] = [[], [], [], [], [], [], [], []];
                    let obj_length = Object.keys(dataObj["data"]).length;
                    for(let  i = 0; i < obj_length; i++)
                    {
                        data_stream["data"][0]['calpoints'].push(parseFloat(Object.keys(dataObj["data"])[i]));
                        for(let k = 0; k < 8; k++)
                        {
                            data_stream["data"][0]['datapoints'][k].push(Object.values(dataObj["data"])[i][`bank${k+1}`]);
                        }

                    }

                    break;
                case 3:
                    data_stream["data"] = {};
                    for(let i = 0; i < 6; i++)
                    {
                        data_stream["data"][i] = {};
                        data_stream["data"][i]['calpoints'] = [];
                        data_stream["data"][i]['datapoints'] = [];
                        for(let j = 0; j < 8; j++)
                        {
                            data_stream["data"][i]['datapoints'][j] = [];
                        }
                    }

                    for(let  i = 0; i < 6; i++)
                    {
                        let cal_value = Object.keys(dataObj["data"])[i];
                        let position = 0;
                        switch (cal_value)
                        {
                            case "250mV":
                                position = 0;
                                data_stream["data"][0]["calpoints"] = Object.keys(Object.values(dataObj["data"])[i]);
                                break;
                            case "1000mV":
                                position = 1;
                                data_stream["data"][1]["calpoints"] = Object.keys(Object.values(dataObj["data"])[i]);
                                break;
                            case "5000mV":
                                position = 2;
                                data_stream["data"][2]["calpoints"] = Object.keys(Object.values(dataObj["data"])[i]);
                                break;
                            case "10V":
                                position = 3;
                                data_stream["data"][3]["calpoints"] = Object.keys(Object.values(dataObj["data"])[i]);
                                break;
                            case "20V":
                                position = 4;
                                data_stream["data"][4]["calpoints"] = Object.keys(Object.values(dataObj["data"])[i]);
                                break;
                            case "45V":
                                position = 5;
                                data_stream["data"][5]["calpoints"] = Object.keys(Object.values(dataObj["data"])[i]);
                                break;
                            default:
                                console.log("error");
                                break
                        }

                        for(let l = 0; l < 8; l++)
                        {
                            let obj_length = Object.keys(Object.values(dataObj["data"])[i]).length;
                            for(let k = 0; k < obj_length; k++)
                            {
                                let calpoints = Object.values(Object.values(dataObj["data"])[i])[k];
                                data_stream["data"][position]["datapoints"][l][k] = Object.values(calpoints)[l];
                            }
                        }
                    }
                    break;
                default:
                    break;
            }

            $('.cal_table_tc_tables').html('');
            $('.cal_table_tc_tables').append(append_cal_table(data_stream));

            switch (data_stream["type"]) {
                case 0:
                    $('.cal_table_').removeClass("hidden");
                    break;
                case 3:
                    let AIN_range = $('.cal_ain_range').find('.ain_select').val();
                    $(`#cal_table_${AIN_range}`).removeClass("hidden");
                    break;
                default:
                    break;
            }

            difference();
            organize();

            $(".ma_calibration button").prop('disabled',false);
        });
    });
}