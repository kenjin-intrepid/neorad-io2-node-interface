const emitStream = require('emit-stream');
const through = require('through');
const EventEmitter = require('events');
const neoRADIO2_RunStates = {
    'neoRADIO2state_Disconnected' : 0,
    'neoRADIO2state_ConnectedWaitForAppStart' : 1,
    'neoRADIO2state_ConnectedWaitIdentResponse' : 2,
    'neoRADIO2state_ConnectedWaitReadSettings' : 3,
    'neoRADIO2state_ConnectedWaitWriteSettings' : 4,
    'neoRADIO2state_Connected' : 5,
};
Object.freeze(neoRADIO2_RunStates);
let neoRADIO_status = 0;
let startFailure = 0;

function NativeConstructor(){
    let myPath;
    let todayDate = new Date();
    let Month = todayDate.getUTCMonth() + 1;
    let Day = todayDate.getUTCDate();
    let Hours = todayDate.getHours();
    let Minutes = todayDate.getMinutes();
    let DateString = `${Month}_${Day}_${Hours}_${Minutes}`;

    myPath = path.join(mypath, `IntrepidCS\/neoRAD-IO2\/${DateString}.csv`);

    let writeStream = 0;

    let emitter = new EventEmitter();
    let worker = new Addon.DataWorker(
        (event, value) => {
            emitter.emit(event, value);
        },
        () => {
            emitter.emit("close");
        },
        error => {
            emitter.emit("error", error);
        },
        {name: "Data Stream"});

    let returnObj = {};
    let EmitEvents = {};
    let device_found_once = 0;
    let send_settings_once = 0;
    let start_get_data = 0;
    let deviceSave = 0;
    let temperatureString = "d";
    let startTime = 0;
    let autoSave = 0;

    if(settings.get("tempUnit"))
    {
        isFahrenheit = settings.get("tempUnit");
    }

    if(settings.get("save") && settings.get("save") == "1")
    {
        autoSave = 1;
    }

    for(let i = 1; i < 9; i++)
    {
        for(let j = 1; j < 9; j++)
        {
            PlotSeries.data[(j - 1) + (i - 1) * 8] = [];
            PlotHistory.data[(j - 1) + (i - 1) * 8] = [];
            PlotData.data[(j - 1) + (i - 1) * 8] = [];
        }
    }

    EmitEvents.from = emitter;
    EmitEvents.from.stream = () => {
        return emitStream(EmitEvents.from).pipe(
            through(function (data) {
                if (data[0] == "close")
                {
                    this.end();
                }
                else
                {
                    this.queue(data);
                }
            }));
    };

    EmitEvents.to = {
        emit: (name, data) => {
            worker.sendToAddon(name, data);
        },
        stream: (name, end) => {
            return through(function write(data) {
                    if (Array.isArray(data))
                    {
                        if (data[0] == "close")
                        {
                            this.end();
                        }
                        else
                        {
                            EmitEvents.to.emit(data[0], data[1]);
                        }
                    }
                    else
                    {
                        EmitEvents.to.emit(name, data);
                    }
                },
                end);
        }
    };

    EmitEvents.from.on('timeout', timeout => {
        worker.closeInput();
        terminateAll();
    });

    EmitEvents.from.on('killall', () => {
        console.log("connection terminated");
        terminateAll();
    });

    EmitEvents.from.on('paused', () => {
        console.log("paused");
    });

    EmitEvents.from.on('device_found', device_found => {
        if(device_found == "device_FAILED_TO_CONNECT")
        {
            worker.closeInput();
            terminateAll();
            change_status_text("Device failed to connect, check physical connection");
            throw "Device failed to connect, check physical connection";
        }
        returnObj.device_found = JSON.parse(device_found);
        if(device_found != "null" && device_found_once === 0)
        {
            if(returnObj.device_found.State != neoRADIO2_RunStates.neoRADIO2state_Connected)
            {
                returnObj.close();
                $('#device_connect').prop('disabled',false);
                startFailure++;
                if(startFailure > 2)
                {
                    change_status_text("Try reconnecting the cable");
                    startFailure = 0;
                }

                returnObj.checkOnlineDevices();
                // throw "Device connection error";
            }
            showConnected();
            readSettings(returnObj.device_found);
            device_found_once = 1;
            neoRADIO_status = 1;
            $('#device_connect').prop('disabled',false);
        }
    });

    EmitEvents.from.on('data_stream', data_stream => {
        startDataStream();
        if(writeStream === 0)
        {
            if(autoSave)
            {
                writeStream = fs.createWriteStream( myPath, {"flags":"a"});
            }
            else
            {
                writeStream = fs.createWriteStream( path.join(mypath, `IntrepidCS\/neoRAD-IO2\/auto.csv`), {"flags":"w"});
            }
        }
        $('#device_startlog').prop('disabled',false);
        if(start_get_data)
        {
            neoRADIO_status = 2;
            processRawData(JSON.parse(data_stream));
        }
    });

    EmitEvents.from.on('settings_reply', settings_reply => {
        if(settings_reply == "WRITE_FAIL")
        {
            change_status_text('Write Failed');
        }
        else
        {
            returnObj.device_found = JSON.parse(settings_reply);
            reloadSettings(JSON.parse(settings_reply));
        }
        $("html,body").removeClass('wait');
        $('.device_save').prop('disabled',false);
        $('.device_save_canhub').prop('disabled',false);
    });

    EmitEvents.from.on('cal_read', data_stream => {
        data_stream = JSON.parse(data_stream);
        console.log(data_stream);
        $("#readButton").prop('disabled',false);
        if(data_stream)
        {
            $("#interactiveButton").prop('disabled',false);
            $('.cal_table_tc_tables').html('');

            for(let i = 0; i < 6; i++)
            {
                if(data_stream['data'][i]['calpoints'] == "invalid")
                {
                    change_status_text('Calibration invalid, please click Clear');
                    return;
                }
            }

            $('.cal_table_tc_tables').append(append_cal_table(data_stream));

            switch (data_stream["type"]) {
                case 0:
                    $('.cal_table_').removeClass("hidden");
                    break;
                case 3:
                    let AIN_select = $('.cal_ain_range').find(`.neorad_ain_sample_input:checked`).val();
                    let AIN_range = "";
                    if(AIN_select == "low")
                    {
                        AIN_range = $('.cal_ain_range').find('.ain_low_select option:selected').val();
                    }
                    else if(AIN_select == "high")
                    {
                        AIN_range = $('.cal_ain_range').find('.ain_high_select option:selected').val();
                    }
                    $(`#cal_table_${AIN_range}`).removeClass("hidden");
                    break;
                default:
                    break;
            }

            difference();
        }
        else
        {
            change_status_text('Read Calibration Failed');
        }
    });

    EmitEvents.from.on('cal_settings', data_stream => {
        if(data_stream && data_stream == "OK")
        {
            $("html,body").removeClass('wait');
            change_status_text('Calibration Stored');
            $("#storeButton").prop('disabled',false);
        }
        else if(data_stream && data_stream != "OK")
        {
            change_status_text(`Writing in progress ${((parseFloat(data_stream) + 1) * 16.6).toFixed(0)}%`);
        }
        else if(data_stream && data_stream == "NOT OK")
        {
            change_status_text('Write Calibration Failed');
            $("#storeButton").prop('disabled',false);
        }
    });

    EmitEvents.from.on('cal_inter', data_stream => {
        data_stream = JSON.parse(data_stream);
        $("#calibration_bank").text(data_stream['bank'] + 1);
        if(data_stream['tempData'] !== -1000 && data_stream['tempData'] != null)
        {
            if($(document.activeElement).attr('data-bank') != (data_stream['bank'] + 1))
            {
                return;
            }

            switch (data_stream['type']) {
                case 0:
                    $(document.activeElement).val(parseFloat(data_stream['tempData'].toFixed(2)));
                    break;
                case 1:
                    break;
                case 2:
                    break;
                case 3:
                    $(document.activeElement).val(parseFloat(data_stream['tempData'].toFixed(4)));
                    break;
                case 4:
                    break;
                case 5:
                    break;
                default:
                    $(document.activeElement).val(parseFloat(data_stream['tempData'].toFixed(2)));
                    break;
            }
        }
    });

    EmitEvents.from.on('cal_clear', data_stream => {
        if(data_stream && data_stream == "done")
        {
            change_status_text('Calibration Cleared');
        }
        else
        {
            change_status_text('Clear Calibration Failed');
        }
        $("#resetCalButton").prop('disabled',false).removeClass("disabled");
    });

    returnObj.close = () => {
        worker.closeInput();
        terminateAll();
    };

    returnObj.pauseData = () => {
        neoRADIO_status = 1;
        worker.pauseInput();
        setTimeout(function () {
            worker.restartInput();
        },300);
    };

    returnObj.checkOnlineDevices = () => {
        if(device_found_once === 0)
        {
            EmitEvents.to.emit("check", 1);
        }
    };

    returnObj.startDataPush = () => {
        EmitEvents.to.emit("check", 3);
        if(startTime === 0)
        {
            let todayDate = new Date();
            let Hours = todayDate.getHours();
            let Minutes = todayDate.getMinutes();
            if(Minutes < 10)
            {
                Minutes = `0${Minutes}`;
            }
            startTime = `${Hours}.${Minutes}`;
        }
    };

    returnObj.SetPwrRly = function(that){
        let type = parseInt($(that).attr('data-type'));
        let deviceID = $(that).attr('data-number');
        let ExtraArray = [];
        let bString = "";

        $.each($(that).find('.input_selector_value'),function (i, el) {
            bString += $(el).val();
        });

        ExtraArray[0] = [];
        ExtraArray[1] = bString.split("");
        ExtraArray[1] = ExtraArray[1].reverse();
        bString = ExtraArray[1].join("");
        ExtraArray[1] = bString;

        /*
        ExAr[0] = Original State
        ExAr[1] = Current State
        */
        ExtraArray[1] = parseInt(ExtraArray[1],2);
        ExtraArray[0] = parseInt(returnObj.device_found['PWRRLY_STATUS']);

        let settingsHere = {
            deviceType: type,
            deviceLink: parseInt(deviceID) - 1,
            extraSettings: ExtraArray
        };

        let JSONstr = JSON.stringify(settingsHere);
        EmitEvents.to.emit("SetPwrRly", JSONstr);
    };

    returnObj.gatherData = function(that){
        let type = parseInt($(that).attr('data-type'));
        let deviceID = $(that).attr('data-number');
        let iloop = $(that).find('.table1 .ma_device_channel_head').length;

        for (let i = 1; i <= iloop; i++)
        {
            let check_stat = $(that).find(`.device_channel${i} .ma_device_channel_status`).prev().prop('checked');
            let sample_stat = $(that).find(`.device_channel${i} .ma_device_channel_pullrate`).val();
            sample_stat = parseInt(sample_stat);

            let CanMode = $(that).find(`.device_channel${i} .ma_device_can_mode`).val();
            let CanMsgType = $(that).find(`.device_channel${i} .ma_device_can_type`).val();
            let CanMsgTypeID = $(that).find(`.device_channel${i} .ma_device_can_id_type`).val();
            let CanMsgToSend;
            if(!CanMsgType)
            {
                CanMsgType = 1;
            }

            if(CanMsgType == 1 && CanMsgTypeID == 3)
            {
                CanMsgToSend = 0;
            }
            if(CanMsgType == 1 && CanMsgTypeID == 4)
            {
                CanMsgToSend = 1;
            }
            if(CanMsgType == 2 && CanMsgTypeID == 3)
            {
                CanMsgToSend = 2;
            }
            if(CanMsgType == 2 && CanMsgTypeID == 4)
            {
                CanMsgToSend = 3;
            }
            let CanId = $(that).find(`.device_channel${i} .ma_device_can_id`).val();
            let CanLocation = $(that).find(`.device_channel${i} .ma_device_can_byte`).val();

            if(CanMode == "1")
            {
                CanMsgToSend = 0xFF;
            }

            if(type == "2" && i !== 1)
            {
                CanId = 0;
                CanMsgToSend = 0xFF;
                CanLocation = 0;
            }

            let tag_name = $(that).find(`.device_channel${i} .ma_device_channel_tag`).val();
            let tag_json = [];
            for(let j = 0; j < tag_name.length; j++)
            {
                tag_json[j] = tag_name.charCodeAt(j);
            }

            if(sample_stat < 10 || !sample_stat){
                sample_stat = 10;
            }

            if(sample_stat > 600000){
                sample_stat = 600000;
            }

            // ExtraArrau
            let ExtraArray = [];

            switch (type) {
                case 0:
                    if(check_stat)
                    {
                        check_stat = 1;
                    }
                    else
                    {
                        check_stat = 0;
                    }
                    break;
                case 1:
                    break;
                case 2:
                    check_stat = 1;
                    break;
                case 3:
                    if(check_stat)
                    {
                        let AIN_select = $(that).find(`.device_channel${i} .neorad_ain_sample_input:checked`).val();
                        if(AIN_select == "low")
                        {
                            check_stat = $(that).find(`.device_channel${i} .ain_low_select`).val();
                        }
                        else if(AIN_select == "high")
                        {
                            check_stat = $(that).find(`.device_channel${i} .ain_high_select`).val();
                        }
                    }
                    else
                    {
                        check_stat = 0;
                    }
                    break;
                case 4:
                    check_stat = 1;
                    ExtraArray = [0, 0, 0];

                    if(parseFloat($(that).find(`.device_channel${i} .neorad_aout_input_1`).val()))
                    {
                        ExtraArray[0] = parseFloat($(that).find(`.device_channel${i} .neorad_aout_input_1`).val());
                    }
                    if(parseFloat($(that).find(`.device_channel${i} .neorad_aout_input_2`).val()))
                    {
                        ExtraArray[1] = parseFloat($(that).find(`.device_channel${i} .neorad_aout_input_2`).val());
                    }
                    if(parseFloat($(that).find(`.device_channel${i} .neorad_aout_input_3`).val()))
                    {
                        ExtraArray[2] = parseFloat($(that).find(`.device_channel${i} .neorad_aout_input_3`).val());
                    }

                    // [3][4][5] enable status for channel 1, 2, 3
                    ExtraArray[3] = 0x00;
                    ExtraArray[4] = 0x00;
                    ExtraArray[5] = 0x00;

                    $(that).find(`.device_channel${i} .device_check_status[type="checkbox"]`).each(function (index, element) {
                        if($(element).prop("checked") == true)
                        {
                            ExtraArray[index+3] = 0x01;
                        }
                    });
                    break;
                case 5:
                    break;
                default:
                    break;
            }

            sendSettings(i, check_stat, sample_stat, type, deviceID, tag_json, CanId, CanMsgToSend, CanLocation, ExtraArray);
        }

        if(type == "5")
        {
            let settingsHere = {
                bank: 0x01,
                enables: 0x01,
                reportRate: 100,
                deviceType: 5,
                deviceLink: parseInt(deviceID),
                tagName:[],
                CanId: 0,
                CanMsgType: 0,
                CanLocation: 0,
                extraSettings: [[0,1],[2,3],[4,5]]
            };

            let JSONstr = JSON.stringify(settingsHere);
            EmitEvents.to.emit("settings", JSONstr);

            send_settings_once = 1;
            deviceSave = deviceID - 1;
        }
    };

    returnObj.setDefault = function (that)
    {
        $(that).find('.ma_device_channel_tag').val("");
        $(that).find('.ma_device_channel_status').prev().prop('checked',true);
        $(that).find('.ma_device_channel_pullrate').val("100");
        $(that).find('.device_check_pullrate_select option[value="100"]').prop('selected',true);
        $(that).find('.ma_device_can_mode option[value="1"]').prop('selected',true);
        $(that).find('.ma_device_can_type').prop("disabled",true);
        $(that).find('.ma_device_can_id_type').prop("disabled",true);
        $(that).find('.ma_device_can_id').prop("disabled",true);
        $(that).find('.ma_device_can_byte').prop("disabled",true);
    };

    function showConnected(){
        let deviceConnected = returnObj.device_found.maxID_Device;
        PlotHistory.maxD = deviceConnected;
        PlotData.maxD = deviceConnected;
        let devices = [];
        if(deviceConnected > 0)
        {
            for (let i = 0; i < deviceConnected; i++)
            {
                devices[i] = {
                    deviceType : returnObj.device_found['chainlist'][`device${i}`]['channel0']['deviceType'],
                    serialNumber : returnObj.device_found['serialNumber'][i],
                };

                if(settings.get("cal") && settings.get("cal") == 1)
                {
                    $('#device_serial').html('');
                    $.each(devices, function (i, item) {
                        if(item.deviceType != "2")
                        {
                            $('#device_serial').append($('<option>', {
                                value: item.deviceType,
                                text : item.serialNumber,
                                "data-index" : i
                            }));
                        }
                    });
                }

                let deviceObject = {
                    deviceType : returnObj.device_found['chainlist'][`device${i}`]['channel0']['deviceType'],
                    serialNumber : returnObj.device_found['serialNumber'][i],
                    manufacture_year : returnObj.device_found['manufacture_year'][i],
                    manufacture_month : returnObj.device_found['manufacture_month'][i],
                    manufacture_day : returnObj.device_found['manufacture_day'][i],
                    firmwareVersion_major : returnObj.device_found['firmwareVersion_major'][i],
                    firmwareVersion_minor : returnObj.device_found['firmwareVersion_minor'][i]
                };
                let AppendTemplate = template1(deviceObject,i);
                $(".ma_device .table-responsive-sm").append(`<div class="ma_device_wrap device${i}" data-type="${deviceObject.deviceType}" data-number="${i+1}">${AppendTemplate}</div>`);
            }
        }

        $('#device_connect').prop('disabled',true).addClass('hidden');
        $('#device_startlog').removeClass('disabled hidden').prop('disabled',false);
        $('#device_reload').removeClass('hidden');

        $("#readButton").prop('disabled',false);
        $("#importButton").prop('disabled',false);
    }

    function startDataStream(){
        $('#device_startlog').prop('disabled',true).text(def_lang.text_logging).removeClass('btn-info').addClass('btn-success disabled');
        $('.device_save').prop('disabled',true).addClass('btn-warning disabled').removeClass('btn-success');
        $('.device_default').prop('disabled',true).addClass('btn-warning disabled').removeClass('btn-success');
        $('.device_check_status').prop('disabled',true);
        $('.ma_device_channel_pullrate').prop('disabled',true);
        $('.device_check_pullrate_select').prop('disabled',true);
        $('.ma_device_channel_tag').prop('disabled',true);

        $('.neorad_ain_sample_input').prop('disabled',true);
        $('.ain_select').prop('disabled',true);
        $('#device_stop').removeClass('disabled hidden').prop('disabled',false);

        $(".ma_calibration button").prop('disabled',true);

        setTimeout(function () {
            start_get_data = 1;
        },100);
    }

    function readSettings(raw) {
        if(raw.State == neoRADIO2_RunStates.neoRADIO2state_Connected)
        {
            for (let i = 0; i < raw.maxID_Device; i++)
            {
                for(let j = 0; j < 8; j++)
                {
                    let ChipOnDevice = j + 1;
                    let EnableStatus = raw['chainlist'][`device${i}`][`channel${j}`]['settingsEnables'];
                    let ReportRate = raw['chainlist'][`device${i}`][`channel${j}`]['settingsReportRate'];
                    let deviceType = raw['chainlist'][`device${i}`][`channel${j}`]['deviceType'];

                    let canArbid = raw['chainlist'][`device${i}`][`channel${j}`]['settingsCanArbid'];
                    let canLocation = raw['chainlist'][`device${i}`][`channel${j}`]['settingsCanLocation'];
                    let canMsgType = raw['chainlist'][`device${i}`][`channel${j}`]['settingsCanMsgType'];

                    let canType, canIdType;

                    switch (canMsgType) {
                        case 0:
                            canType = 1;
                            canIdType = 3;
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_mode`).val("0");
                            break;
                        case 1:
                            canType = 1;
                            canIdType = 4;
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_mode`).val("0");
                            break;
                        case 2:
                            canType = 2;
                            canIdType = 3;
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_mode`).val("0");
                            break;
                        case 3:
                            canType = 2;
                            canIdType = 4;
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_mode`).val("0");
                            break;
                        case 255:
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_mode`).val("1");
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_type`).prop("disabled",true);
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_id_type`).prop("disabled",true);
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_id`).prop("disabled",true);
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_byte`).prop("disabled",true);
                            break;
                    }

                    let tagName = raw['chainlist'][`device${i}`][`channel${j}`]['settingsNameArray'];
                    let tagNameString = "";
                    for(let k = 0; k < tagName.length; k++)
                    {
                        tagNameString += String.fromCharCode(tagName[k]);
                    }

                    PlotSeries.enables.push(EnableStatus);

                    if(EnableStatus > 0)
                    {
                        $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_channel_status`).text(def_lang.text_enable).prev().prop('checked',true);
                    }
                    else
                    {
                        $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_channel_status`).text(def_lang.text_disable).prev().prop('checked',false);
                    }

                    $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_channel_pullrate`).val(ReportRate);
                    if( ReportRate == 10 ||
                        ReportRate == 20 ||
                        ReportRate == 50 ||
                        ReportRate == 100 ||
                        ReportRate == 200 ||
                        ReportRate == 500 ||
                        ReportRate == 1000 ||
                        ReportRate == 2000 ||
                        ReportRate == 5000
                    )
                    {
                        $(`.ma_device .device${i} .device_channel${ChipOnDevice} .device_check_pullrate_select option[value="${ReportRate}"]`).prop('selected',true);
                    }
                    else
                    {
                        $(`.ma_device .device${i} .device_channel${ChipOnDevice} .device_check_pullrate_select option[value="0"]`).prop('selected',true);
                        $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_channel_pullrate`).prop('disabled',false);
                        $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_channel_pullrate`).parent().removeClass('opacity');
                    }

                    if(tagName && tagName != "")
                    {
                        $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_channel_tag`).val(tagNameString);
                    }

                    $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_type`).val(canType);
                    $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_id_type`).val(canIdType);
                    $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_id`).val(`0x${canArbid.toString(16)}`);
                    $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_can_byte`).val(canLocation);

                    switch (deviceType) {
                        case 0:
                            break;
                        case 1:
                            break;
                        case 2:
                            $('.ma_device_wrap[data-type="2"] .device_default').addClass('hidden').prop('disabled',true);

                            if(raw['PWRRLY_STATUS'])
                            {
                                let bStatus = parseInt(raw['PWRRLY_STATUS']).toString(2);
                                let arrayholder = bStatus.split("");
                                arrayholder = arrayholder.reverse();
                                bStatus = arrayholder.join("");

                                for(let k = 0; k < bStatus.length; k++)
                                {
                                    if(bStatus[k] == 1)
                                    {
                                        $(`.ma_device .device${i} .device_channel${k+1} #rly_on_${i}_${k+1}`).prop('checked',true);
                                        let currentSelector = $(`.ma_device .device${i} .device_channel${k+1} #input_selector_bg_${i}_${k+1}`);
                                        let currentValue = $(currentSelector).find('.input_selector_value').val();
                                        if (currentValue == "0")
                                        {
                                            $(currentSelector).find('.input_selector').animate({left:36}, {
                                                duration: 0,
                                                complete: () => {
                                                    $(currentSelector).prev().removeClass("offline");
                                                    $(currentSelector).next().addClass("online");
                                                    $(currentSelector).find('.input_selector_value').val("1");
                                                }
                                            });
                                        }
                                        else if(currentValue == "1")
                                        {
                                            $(currentSelector).find('.input_selector').animate({left:-1},{
                                                duration: 0,
                                                complete: () => {
                                                    $(currentSelector).prev().addClass("offline");
                                                    $(currentSelector).next().removeClass("online");
                                                    $(currentSelector).find('.input_selector_value').val("0");
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                            break;
                        case 3:
                            if(EnableStatus > 0 && EnableStatus < 4)
                            {
                                $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ain_low_select option[value=${EnableStatus}]`).prop('selected',true);
                            }
                            else if(EnableStatus > 3 && EnableStatus < 7)
                            {
                                $(`.ma_device .device${i} .device_channel${ChipOnDevice} .neorad_ain_sample_input[value="high"]`).prop("checked",true);
                                $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ain_low_select`).addClass('hidden');
                                $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ain_high_select`).removeClass('hidden');
                                $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ain_high_select option[value=${EnableStatus}]`).prop('selected',true);
                            }
                            break;
                        case 4:
                            break;
                        case 5:
                            break;
                    }
                }
            }

            if(parseInt($('#device_serial option:selected').val()) == 3)
            {
                $('.ma_calibration .neorad_ain_sample').removeClass('hidden');
            }
            else
            {
                $('.ma_calibration .neorad_ain_sample').addClass('hidden');
            }
        }
    }

    function processRawData(raw) {
        if(raw.State == neoRADIO2_RunStates.neoRADIO2state_Connected)
        {
            let rawObj = {};
            let unit;
            let time_us = raw['tempData']['Timeus'];

            for (let i = 0; i < raw.maxID_Device; i++)
            {
                for(let j = 0; j < 8; j++)
                {
                    let temperature;
                    let displayString;
                    let ChipOnDevice = j + 1;
                    let deviceType = raw['chainlist'][`device${i}`][`channel${j}`]['deviceType'];
                    if(raw['tempData'][`device${i}`])
                    {
                        switch (deviceType) {
                            case 0:
                                unit = "&#176C";
                                if(isFahrenheit == 1)
                                {
                                    unit = "&#176F";
                                }

                                temperature = temperatureConversion(raw['tempData'][`device${i}`][`channel${j}`]);
                                if(temperature != undefined && temperature != "d")
                                {
                                    displayString = `${(temperature.toFixed(2))}${unit}`;
                                }
                                break;
                            case 1:
                                break;
                            case 2:
                                break;
                            case 3:
                                if($(`input[name="ain_${i}_b${j+1}"]:checked`).val() == "low")
                                {
                                    temperature = voltageConversion(raw['tempData'][`device${i}`][`channel${j}`]);
                                    unit = "mV";
                                    if(temperature != undefined && temperature != "d" && temperature != "error")
                                    {
                                        displayString = `${(temperature * 1000).toFixed(3)}${unit}`;
                                    }
                                    else if(temperature == "error")
                                    {
                                        displayString = "Over Range";
                                    }
                                }
                                else if($(`input[name="ain_${i}_b${j+1}"]:checked`).val() == "high")
                                {
                                    temperature = voltageConversion(raw['tempData'][`device${i}`][`channel${j}`]);
                                    unit = "V";
                                    if(temperature != undefined && temperature != "d" && temperature != "error")
                                    {
                                        displayString = `${temperature.toFixed(4)}${unit}`;
                                    }
                                    else if(temperature == "error")
                                    {
                                        displayString = "Over Range";
                                    }
                                }
                                break;
                            case 4:
                                break;
                            case 5:
                                break;
                        }
                    }
                    else
                    {
                        temperature = undefined;
                    }

                    if(temperature !== undefined)
                    {
                        if(temperature === temperatureString)
                        {
                            if($(`.ma_device .device${i} .device_channel${ChipOnDevice} input[data-check="${j+1}"]`).prop('checked')){
                                $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_channel_temp`).html(def_lang.text_disc).removeClass("em15 online").addClass("em1 offline");
                            }
                            $(`#cbtemp_d${i}_c${j+1}`).html('').removeClass("online").addClass("offline");
                        }
                        else if(temperature == "error")
                        {
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_channel_temp`).html(displayString).addClass('em15 online').removeClass("em1 offline");
                            $(`#cbtemp_d${i}_c${j+1}`).html(displayString).addClass('online').removeClass("offline");
                        }
                        else
                        {
                            $(`.ma_device .device${i} .device_channel${ChipOnDevice} .ma_device_channel_temp`).html(displayString).addClass('em15 online').removeClass("em1 offline");
                            $(`#cbtemp_d${i}_c${j+1}`).html(displayString).addClass('online').removeClass("offline");
                            tempPushToArray(temperature,i,j,exportTime(time_us));
                        }
                    }

                    if(temperature === temperatureString)
                    {
                        rawObj['time'] = exportTime(time_us);
                        rawObj[`device${i+1}_bank${j+1}`] = temperatureString;
                    }
                    else
                    {
                        rawObj['time'] = exportTime(time_us);
                        switch (deviceType) {
                            case 0:
                                rawObj[`device${i+1}_bank${j+1}`] = parseFloat(temperature.toFixed(2));
                                break;
                            case 3:
                                rawObj[`device${i+1}_bank${j+1}`] = temperature;
                                break;
                        }
                    }

                    if(deviceType == "2")
                    {
                        break;
                    }
                }
            }

            $(`.ma_device_channel_time`).html(`${readableTime(time_us)}`);
            if(rawObj['time'])
            {
                dumpDataFile(rawObj);
            }
        }
    }

    function sendSettings(bank, enables, reportRate, deviceType, deviceLink, tagName, CanId, CanMsgType, CanLocation, extra){
        let settingsHere = {
            bank: parseInt(bank) - 1,
            enables: parseInt(enables),
            reportRate: parseInt(reportRate),
            deviceType: parseInt(deviceType),
            deviceLink: parseInt(deviceLink) - 1,
            tagName: tagName,
            CanId: parseInt(CanId),
            CanMsgType: parseInt(CanMsgType),
            CanLocation: parseInt(CanLocation),
            extraSettings: extra
        };

        let JSONstr = JSON.stringify(settingsHere);
        EmitEvents.to.emit("settings", JSONstr);
        send_settings_once = 1;
        deviceSave = deviceLink - 1;
    }

    function reloadSettings(raw) {
        let objvalue = Object.values(raw["chainlist"])[deviceSave];
        PlotSeries.enables = [];
        for(let i = 0; i < Object.keys(objvalue).length; i++)
        {
            let enables = Object.values(objvalue)[i]['settingsEnables'];
            let samplerate = Object.values(objvalue)[i]['settingsReportRate'];

            if(enables == 0)
            {
                $(`.device${deviceSave} .device_channel${i+1} .ma_device_channel_status`).prev().prop('checked',false).text(def_lang.text_disable);
                $(`.device${deviceSave} .device_channel${i+1} .ma_device_channel_temp`).text("");
            }
            else if(enables == 1)
            {
                $(`.device${deviceSave} .device_channel${i+1} .ma_device_channel_status`).prev().prop('checked',true).text(def_lang.text_enable);
                $(`.device${deviceSave} .device_channel${i+1} .ma_device_channel_temp`).text("");
            }

            $(`.device_${deviceSave} .device_channel${i+1} .ma_device_channel_pullrate`).val(samplerate);

            let canArbid = Object.values(objvalue)[i]['settingsCanArbid'];
            let canLocation = Object.values(objvalue)[i]['settingsCanLocation'];
            let canMsgType = Object.values(objvalue)[i]['settingsCanMsgType'];
            let canType, canIdType;
            switch (canMsgType) {
                case 0:
                    canType = 1;
                    canIdType = 3;
                    $(`.ma_device .device${deviceSave} .device_channel${i+1} .ma_device_can_mode`).val("0");
                    break;
                case 1:
                    canType = 1;
                    canIdType = 4;
                    $(`.ma_device .device${deviceSave} .device_channel${i+1} .ma_device_can_mode`).val("0");
                    break;
                case 2:
                    canType = 2;
                    canIdType = 3;
                    $(`.ma_device .device${deviceSave} .device_channel${i+1} .ma_device_can_mode`).val("0");
                    break;
                case 3:
                    canType = 2;
                    canIdType = 4;
                    $(`.ma_device .device${deviceSave} .device_channel${i+1} .ma_device_can_mode`).val("0");
                    break;
                case 255:
                    $(`.ma_device .device${deviceSave} .device_channel${i+1} .ma_device_can_mode`).val("1");
                    $(`.ma_device .device${deviceSave} .device_channel${i+1} .ma_device_can_type`).prop("disabled",true);
                    $(`.ma_device .device${deviceSave} .device_channel${i+1} .ma_device_can_id_type`).prop("disabled",true);
                    $(`.ma_device .device${deviceSave} .device_channel${i+1} .ma_device_can_id`).prop("disabled",true);
                    $(`.ma_device .device${deviceSave} .device_channel${i+1} .ma_device_can_byte`).prop("disabled",true);
                    break;
            }

            let tagName = Object.values(objvalue)[i]['settingsNameArray'];
            let tagNameString = "";
            for(let k = 0; k < 14; k++)
            {
                tagNameString += String.fromCharCode(tagName[k]);
            }

            if(tagName && tagName != "")
            {
                $(`.device_${deviceSave} .device_channel${i+1} .ma_device_channel_tag`).val(tagNameString);
            }

            $(`.device_${deviceSave} .device_channel${i+1} .ma_device_can_type`).val(canType);
            $(`.device_${deviceSave} .device_channel${i+1} .ma_device_can_id_type`).val(canIdType);
            $(`.device_${deviceSave} .device_channel${i+1} .ma_device_can_id`).val(canArbid);
            $(`.device_${deviceSave} .device_channel${i+1} .ma_device_can_byte`).val(canLocation);
        }

        for (let i = 0; i < returnObj.device_found.maxID_Device; i++)
        {
            for(let j = 0; j < 8; j++)
            {
                let EnableStatus = raw['chainlist'][`device${i}`][`channel${j}`]['settingsEnables'];
                PlotSeries.enables.push(EnableStatus);
            }
        }

        change_status_text('Settings Saved');
    }

    function readableTime(time) {
        let date = new Date(time);
        return `${date.getUTCHours()} hours ${date.getUTCMinutes()} minutes ${date.getUTCSeconds()} seconds`;
    }

    function exportTime(time) {
        let date = new Date(time);
        let hour = date.getUTCHours();
        let min = date.getUTCMinutes();
        let sec = date.getUTCSeconds();
        let millisec = date.getUTCMilliseconds();
        let returntime;
        if(min < 10 && min > 0)
        {
            min = `0${min}`;
        }

        if(sec < 10 && sec > 0)
        {
            sec = `0${sec}`;
        }

        if(millisec < 100 && millisec > 0)
        {
            if(millisec < 10)
            {
                millisec = `00${millisec}`;
            }
            else
            {
                millisec = `0${millisec}`;
            }
        }

        if(hour === 0)
        {
            returntime = `${min}:${sec}:${millisec}`;
        }
        else
        {
            returntime = `${hour}:${min}:${sec}:${millisec}`;
        }

        return returntime;
    }

    function terminateAll() {
        $(".online").removeClass("online").addClass("offline").text(def_lang.text_offline);
        $('#device_stop').addClass('disabled hidden').prop('disabled',true);
        $(".ma_device_channel_temp").text("");
        $(".ma_device_channel_time").text("");
        $(".ma_device_wrap").remove();
        clickStop();

        setTimeout(() => {
            $('#device_connect').prop('disabled',false).removeClass('hidden');
            $('#device_startlog').prop('disabled',true).text(def_lang.device_startlog).removeClass('btn-success disabled').addClass('btn-info hidden');
            $('#device_stop').addClass('hidden');
            $('#device_reload').addClass('hidden');
            $('.device_save').addClass('hidden');
            $('.device_default').addClass('hidden');

            $('.neorad_ain_sample_input').prop('disabled',false);
            $('.ain_select').prop('disabled',false);
        },200);

        $('.neorad_ain_sample').addClass('hidden');
        $(".ma_calibration button").prop('disabled',true);
        $("#device_serial option[data-index='0']").prop('selected',true);
        $(".cal_table_tc_tables").html("");

        neoRADIO_status = 0;
        globalObj = "";
        plotlyInit = true;
        PlotSeries.enables = [];

        if($('.ma_device').hasClass('hidden'))
        {
            $('.nav-link').blur();
            $('.nav_device').click();
        }

        if($("html,body").hasClass('wait'))
        {
            $("html,body").removeClass('wait');
        }
    }

    returnObj.pauseAll = function () {
        $('.device_default').prop('disabled',false).removeClass('btn-warning disabled').addClass('btn-success');
        $('#device_startlog').prop('disabled',false).text(def_lang.device_startlog).removeClass('btn-success disabled').addClass('btn-info');
        $('.device_check_pullrate_select').prop('disabled',false);
        $('.ma_device_channel_tag').prop('disabled',false);
        $('.device_check_pullrate_select').each(function (index, element) {
            if($(element).val() == 0)
            {
                $(element).next().prop('disabled',false);
            }
        });

        $(".ma_device_can_mode").each(function (index, element) {
            if($(element).val() == "0")
            {
                $($('.ma_device_can_type')[index]).prop('disabled',false);
                $($('.ma_device_can_id_type')[index]).prop('disabled',false);
                $($('.ma_device_can_id')[index]).prop('disabled',false);
                $($('.ma_device_can_byte')[index]).prop('disabled',false);
            }
        });

        $('.neorad_ain_sample_input').prop('disabled',false);
        $('.ain_select').prop('disabled',false);

        $("#readButton").prop('disabled',false);
        $("#importButton").prop('disabled',false);
        if($('.cal_table_tc_tables table').length > 0)
        {
            $(".ma_calibration button").prop('disabled',false);
        }

        setTimeout(function () {
            $('.device_save').prop('disabled',false).removeClass('btn-warning disabled').addClass('btn-success');
        },2000);
    };

    returnObj.checkTagName = function() {
        let deviceConnected = returnObj.device_found.maxID_Device;

        for(let i = 0; i < deviceConnected; i++)
        {
            for(let j = 1; j < 9; j++)
            {
                let currentValue = $(`#device_check_tag${i}_${j}`);
                if(currentValue.val())
                {
                    let data_id = $(currentValue).attr('data-checkbox');
                    let chart_id = $('.ma_graph .ma_graph_sidebar_nav_channel').find(`input[data-checkbox="${data_id}"]`).next('label');
                    chart_id.text(currentValue.val());
                }
            }
        }
    };

    let dumpData = [];
    let FirstHeader = true;
    function dumpDataFile(raw) {
        dumpData.push(raw);
        let DataJSON;

        if(dumpData.length > 50)
        {
            while(Object.keys(dumpData[0]).length !== Object.keys(dumpData[dumpData.length - 1]).length)
            {
                dumpData.shift();
            }

            DataJSON = Papa.unparse(dumpData,{
                header:FirstHeader
            });

            if(FirstHeader === true)
            {
                FirstHeader = false;
            }

            if(writeStream !== 0)
            {
                writeStream.write(`${DataJSON} \r\n`);
            }
            dumpData = [];
        }
    }

    function temperatureConversion(value) {
        if(value === -1000 || value == null)
        {
            return temperatureString;
        }

        let converted = value;
        if(isFahrenheit == 1)
        {
            converted = value * 9 / 5 + 32;
        }

        return converted;
    }

    function voltageConversion(value) {
        if(value === -1000 || value == null || value == undefined)
        {
            return temperatureString;
        }
        else if(value == "inf")
        {
            return "error";
        }

        return value;
    }

    function tempPushToArray(raw,device,bank,time_us) {
        if(typeof raw != "number")
        {
            raw = 0;
        }

        if(PlotSeries.time == "")
        {
            PlotSeries.time = [time_us];
        }

        if(PlotSeries.data[bank+(device*8)].length == 0)
        {
            PlotSeries.data[bank+(device*8)].push(parseFloat(raw.toFixed(1)));
        }

        let len = PlotHistory.time.length;
        PlotHistory.data[bank+(device*8)][len] = parseFloat(raw.toFixed(1));
        if(PlotHistory.time[PlotHistory.time.length - 1] !== time_us)
        {
            PlotHistory.time.push(time_us);
        }

        if(len > 10000)
        {
            console.time('reduce');
            let date = new Date();
            let month = date.getMonth() + 1;
            let day = date.getDate();
            let Minutes = date.getMinutes();
            if(Minutes < 10)
            {
                Minutes = `0${Minutes}`;
            }
            let end = `${date.getHours()}.${Minutes}`;

            let len1 = len;
            while (len1--)
            {
                if(len1 % 4 === 0)
                {
                    PlotHistory.time.splice(len1, 3);
                }
            }
            for(let i = 0; i < PlotHistory.maxD; i++)
            {
                for(let j = 0; j < 8; j++)
                {
                    let len2 = len;
                    while (len2--)
                    {
                        if(len2 % 4 === 0)
                        {
                            PlotHistory.data[j + (i * 8)].splice(len2, 3);
                        }
                    }

                    while(PlotHistory.data[j + (i * 8)].length > 2500)
                    {
                        PlotHistory.data[j + (i * 8)].pop();
                    }
                }
            }

            if(autoSave)
            {
                PlotData.time.push(...PlotHistory.time);
                for(let i = 0; i < 8; i++)
                {
                    for(let j = 0; j < 8; j++)
                    {
                        PlotData.data[j + (i * 8)].push(...PlotHistory.data[j + (i * 8)]);
                    }
                }
            }

            PlotHistory.time = [];
            for(let i = 0; i < 8; i++)
            {
                for(let j = 0; j < 8; j++)
                {
                    PlotHistory.data[j + (i * 8)] = [];
                }
            }

            if (PlotData.time.length > 15000 && autoSave)
            {
                let Path = path.join(mypath, `IntrepidCS\/neoRAD-IO2\/PlotHistory\/${month}-${day} ${startTime}-${end}.json`);
                addSelectOption(`${month}-${day} ${startTime}-${end}`);
                fs.writeFile(Path, JSON.stringify(PlotData), err => {
                    if (err) throw err;
                });
                startTime = end;

                PlotData.time = [];
                for (let i = 0; i < 9; i++)
                {
                    for (let j = 0; j < 8; j++)
                    {
                        PlotData.data[j + (i * 8)] = [];
                    }
                }
            }

            console.timeEnd('reduce');
        }
    }

    returnObj.readCalSettings = () => {
        let tableOBJ = {
            device: parseInt($('#device_serial option:selected').attr('data-index')),
            type: parseInt($('#device_serial option:selected').val()),
            deviceChannel: 0,
            deviceRange: 0
        };

        $(".ma_calibration button").prop('disabled',false);
        EmitEvents.to.emit("cal_readcal", JSON.stringify(tableOBJ));
    };

    returnObj.saveCal = () => {
        let tablelength = $(".cal_table_").length;
        for(let i = 0; i < tablelength; i++)
        {
            let tableOBJ = {
                device: parseInt($('#device_serial option:selected').attr('data-index')),
                type: parseInt($('#device_serial option:selected').val()),
                pt_array:[],
                bank1:[],
                bank2:[],
                bank3:[],
                bank4:[],
                bank5:[],
                bank6:[],
                bank7:[],
                bank8:[],
                deviceChannel: 0,
                deviceRange: i
            };

            $(`#cal_table_${i} .cal_input_th`).each(function (index) {
                let tRowI = $(`#cal_table_${i} .cal_input_th`)[index];
                let tRow = $(tRowI).closest('tr').find('td');
                let PointValue = parseFloat($(tRowI).val());
                if(!PointValue)
                {
                    PointValue = 0;
                }
                tableOBJ.pt_array.push(PointValue);
                for(let i = 1; i < 9; i++)
                {
                    let cSelector = $(tRow)[i+1];
                    let Value = $(cSelector).find('.cal_me').val();
                    if(Value)
                    {
                        tableOBJ[`bank${i}`].push(parseFloat(Value));
                    }
                    else
                    {
                        tableOBJ[`bank${i}`].push(parseFloat(PointValue));
                    }
                }
            });

            if(tableOBJ.pt_array.length === 0)
            {
                change_status_text('Points empty');
                $("#storeButton").prop('disabled',false);
                return;
            }

            EmitEvents.to.emit("cal_settings", JSON.stringify(tableOBJ));
        }
    };

    returnObj.interactiveCal = bank => {
        let tableOBJ = {
            device: parseInt($('#device_serial option:selected').attr('data-index')),
            bank: bank,
            type: parseInt($('#device_serial option:selected').val())
        };

        EmitEvents.to.emit("cal_inter", JSON.stringify(tableOBJ));
    };

    returnObj.manualCal = () => {
        EmitEvents.to.emit("cal_manual", 1);
    };

    returnObj.clearCal = () => {
        let tableOBJ = {
            device: parseInt($('#device_serial option:selected').attr('data-index'))
        };

        EmitEvents.to.emit("clear_cal", JSON.stringify(tableOBJ));
    };

    return returnObj;
}

// initialize native object
let globalObj;

$('#device_connect').on('click',function(){
    $(this).prop('disabled',true);
    globalObj = NativeConstructor();
    globalObj.checkOnlineDevices();
});

$('#device_startlog').on('click',function(){
    setTimeout(function () {
        globalObj.startDataPush();
        $(this).prop('disabled',true);
        $('#device_stop').prop('disabled',false);
    },600);
});

$('#device_stop').on('click',function () {
    $(this).prop('disabled',true);
    if(neoRADIO_status === 2)
    {
        globalObj.pauseData();
        setTimeout(function () {
            globalObj.pauseAll();
        },1000);
    }
});

$('#device_reload').on('click',() => {
    globalObj.close();
});

$('.ma_device').on('click','.device_group',function(){
    $(this).toggleClass('disabled');
    if($(this).hasClass('disabled'))
    {
        $(this).text("Off");
        let selector = $(this).parents('.ma_device_wrap').find('.group_select');
        let selector2 = $(this).parents('.ma_device_wrap').find('.group_select_ain_radio');
        let selector3 = $(this).parents('.ma_device_wrap').find('.group_select_ain_select');
        let selector4 = $(this).parents('.ma_device_wrap').find('.device_check_status');
        $(selector).off();
        $(selector2).off();
        $(selector3).off();
        $(selector4).off();
    }
    else
    {
        $(this).text("On");
        let selector = $(this).parents('.ma_device_wrap').find('.group_select');
        let selector2 = $(this).parents('.ma_device_wrap').find('.group_select_ain_radio');
        let selector3 = $(this).parents('.ma_device_wrap').find('.group_select_ain_select');
        let selector4 = $(this).parents('.ma_device_wrap').find('.device_check_status');

        $(selector).on('change', function() {
            $(selector).val($(this).val());
        });
        $(selector2).on('change', function() {
            $(selector2).each((index , element) => {
                if($(element).val() == $(this).val())
                {
                    $(element).prop('checked',true);
                }
            });

            if($(this).val() == "low")
            {
                $(this).parents('.ma_device_wrap').find('.ain_low_select').removeClass("hidden");
                $(this).parents('.ma_device_wrap').find('.ain_high_select').addClass("hidden");
            }
            else if($(this).val() == "high")
            {
                $(this).parents('.ma_device_wrap').find('.ain_low_select').addClass("hidden");
                $(this).parents('.ma_device_wrap').find('.ain_high_select').removeClass("hidden");
            }
        });
        $(selector3).on('change', function() {
            $(selector3).val($(this).val());
        });
        $(selector4).on('change', function() {
            $(selector4).prop('checked', $(this).prop('checked'));
        });
    }
});

$('.ma_device').on('click','.can_fill_apply',function () {
    $(this).parents('.ma_device_wrap').find('.ma_device_can_mode').val("0");
    $(this).parents('.ma_device_wrap').find('.ma_device_can_type').prop('disabled',false);
    $(this).parents('.ma_device_wrap').find('.ma_device_can_id_type').prop('disabled',false);
    $(this).parents('.ma_device_wrap').find('.ma_device_can_id').prop('disabled',false);
    $(this).parents('.ma_device_wrap').find('.ma_device_can_byte').prop('disabled',false);
    let Value = $(this).parents('.ma_device_wrap').find('.can_fill_select').val();
    let Startid = parseInt($(this).parents('.ma_device_wrap').find('.can_fill_id').val());

    if(typeof Startid != "number")
    {
        change_status_text('Please enter a correct Value');
        return;
    }

    switch (Value) {
        case "1":
            $(this).parents('.ma_device_wrap').find('.ma_device_can_id').each(function (index, element) {
                $(element).val(`0x${index + Startid}`);
            });
            $(this).parents('.ma_device_wrap').find('.ma_device_can_byte').each(function (index, element) {
                $(element).val(0);
            });
            break;
        case "2":
            $(this).parents('.ma_device_wrap').find('.ma_device_can_id').each(function (index, element) {
                $(element).val(`0x${parseInt(index / 2) % 4 + Startid}`);
            });
            $(this).parents('.ma_device_wrap').find('.ma_device_can_byte').each(function (index, element) {
                if(index % 2 == 0)
                {
                    $(element).val(0);
                }
                else
                {
                    $(element).val(4);
                }
            });
            break;
        case "3":
            $(this).parents('.ma_device_wrap').find('.ma_device_can_id').each(function (index, element) {
                $(element).val(`0x${parseInt(Startid)}`);
            });
            $(this).parents('.ma_device_wrap').find('.ma_device_can_byte').each(function (index, element) {
                $(element).val(index*4);
            });
            break;
    }
});

$('.ma_device').on('click','.device_save',function(){
    $('.device_save').prop('disabled',true);
    $('.device_save_canhub').prop('disabled',true);
    $('#device_startlog').prop('disabled',true);
    $('html,body').addClass('wait');
    let that = $(this).parents('.ma_device_wrap');
    globalObj.gatherData(that);
    setTimeout(function () {
        $('#device_startlog').prop('disabled',false);
    },2000);
});

$('.ma_device').on('click','.device_save_canhub',function(){
    $('.device_save').prop('disabled',true);
    $('.device_save_canhub').prop('disabled',true);
    $('#device_startlog').prop('disabled',true);
    $('html,body').addClass('wait');
    let that = $(this).parents('.ma_device_wrap');
    globalObj.gatherData(that);
    setTimeout(function () {
        $('#device_startlog').prop('disabled',false);
    },2000);
});

$('.ma_device').on('click','.device_default',function(){
    let that = $(this).parents('.ma_device_wrap').find('.table:not(.hidden)');
    globalObj.setDefault(that);
});

$('.ma_device').on('click','.ma_device_table_tab1',function(){
    $(this).parents('.ma_device_wrap').find('.table1').removeClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table2').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table3').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.table4').addClass('hidden');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab2').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab3').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).parents('.ma_device_wrap').find('.ma_device_table_tab4').addClass('ma_device_table_head_inv').removeClass('ma_device_table_head');
    $(this).removeClass('ma_device_table_head_inv').addClass('ma_device_table_head');
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
});

function saveCal() {
    $("#storeButton").prop('disabled',true);
    $('html,body').addClass('wait');
    if(globalObj == undefined || globalObj == "")
    {
        change_status_text("Connect to Device first");
        $("#storeButton").prop('disabled',false);
        return;
    }

    let currentValue = $('.ma_calibration .input_selector_bg').find('.input_selector_value').val();
    if(currentValue == "1")
    {
        $('.ma_calibration .input_selector_bg').find('.input_selector').animate({left:-1},{
            duration: 50
        });

        $('.ma_calibration .input_selector_bg').prev().addClass("offline");
        $('.ma_calibration .input_selector_bg').next().removeClass("online");
        $('.ma_calibration .input_selector_bg').find('.input_selector_value').val("0");

        $('.cal_table_tc').off('focus','.cal_me');
        $("#readButton").prop('disabled',false);
        $("#calibration_bank").text("");
        globalObj.manualCal();
    }

    globalObj.saveCal();
}

function readnative(){
    $("#readButton").prop('disabled',true);
    if($("#removeButton").attr('data-toggle') == 'cancel')
    {
        editRow();
    }

    if(globalObj == undefined || globalObj == "")
    {
        change_status_text("Connect to Device first");
        $("#readButton").prop('disabled',false);
        return;
    }
    globalObj.readCalSettings();
}

function resetCal(){
    $("#resetCalButton").prop('disabled',true).addClass("disabled");
    dialog.showMessageBox({
        type:"warning",
        buttons:["OK","Cancel"],
        message:"Your Calibration Data will be cleared",
        cancelId: 0,
    },function (op) {
        if(!op)
        {
            globalObj.clearCal();
        }
        else
        {
            $("#resetCalButton").prop('disabled',false).removeClass("disabled");
        }
    });
}

$('.ma_device').on('click','.input_selector_bg',function () {
    let currentValue = $(this).find('.input_selector_value').val();
    if (currentValue == "0")
    {
        $(this).find('.input_selector').animate({left:36}, {
            duration: 50,
            complete: () => {
                $(this).prev().removeClass("offline");
                $(this).next().addClass("online");
                $(this).find('.input_selector_value').val("1");

                let that = $(this).parents('.ma_device_wrap');
                if(neoRADIO_status == 2)
                {
                    globalObj.pauseData();
                    globalObj.SetPwrRly(that);
                    globalObj.startDataPush();
                }
                else
                {
                    globalObj.SetPwrRly(that);
                }
            }
        });
    }
    else if(currentValue == "1")
    {
        $(this).find('.input_selector').animate({left:-1},{
            duration: 50,
            complete: () => {
                $(this).prev().addClass("offline");
                $(this).next().removeClass("online");
                $(this).find('.input_selector_value').val("0");

                let that = $(this).parents('.ma_device_wrap');
                if(neoRADIO_status == 2)
                {
                    globalObj.pauseData();
                    globalObj.SetPwrRly(that);
                    globalObj.startDataPush();
                }
                else
                {
                    globalObj.SetPwrRly(that);
                }
            }
        });
    }
});

$('.ma_calibration').on('click','.input_selector_bg',function () {
    let currentValue = $(this).find('.input_selector_value').val();
    if (currentValue == "0")
    {
        $(this).find('.input_selector').animate({left:36}, {
            duration: 50,
            complete: () => {
                $(this).prev().removeClass("offline");
                $(this).next().addClass("online");
                $(this).find('.input_selector_value').val("1");

                $('.cal_table_tc').on('focus','.cal_me',function () {
                    let calibration_bank = parseInt($(document.activeElement).attr('data-bank'));
                    if(calibration_bank > 0 && calibration_bank < 9)
                    {
                        $("#readButton").prop('disabled',true);
                        globalObj.interactiveCal(calibration_bank);
                    }
                });
            }
        });
    }
    else if(currentValue == "1")
    {
        $(this).find('.input_selector').animate({left:-1},{
            duration: 50,
            complete: () => {
                $(this).prev().addClass("offline");
                $(this).next().removeClass("online");
                $(this).find('.input_selector_value').val("0");

                $('.cal_table_tc').off('focus','.cal_me');
                $("#readButton").prop('disabled',false);
                $("#calibration_bank").text("");
                globalObj.manualCal();
            }
        });
    }
});

$('.ma_device').on('blur','.neorad_aout_input',function () {
    console.log('blur');
});