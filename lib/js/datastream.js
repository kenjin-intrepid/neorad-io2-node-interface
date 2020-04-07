const neoRADIO2_RunStates = {
    'neoRADIO2state_Disconnected' : 0,
    'neoRADIO2state_ConnectedWaitForAppStart' : 1,
    'neoRADIO2state_ConnectedWaitIdentResponse' : 2,
    'neoRADIO2state_ConnectedWaitReadSettings' : 3,
    'neoRADIO2state_ConnectedWaitWriteSettings' : 4,
    'neoRADIO2state_ConnectedWaitFinishWriteSettings' : 5,
    'neoRADIO2state_Connected' : 6,
};
Object.freeze(neoRADIO2_RunStates);

function NativeConstructor(){
    const Addon = require("bindings")("neoRAD_IO2");
    const EventEmitter = require('events');
    if(typeof Addon == 'undefined')
    {
        change_error_text("Missing SDK, Native module can't be loaded");
        return;
    }

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
        }
    );

    let EmitEvents = {
        from: emitter,
        to: {
            emit: (name, data) => {
                worker.sendToAddon(name, data);
            }
        }
    };

    let returnObj = {};
    let device_found_once = 0;
    let send_settings_once = 0;
    let start_get_data = 0;
    let deviceSave = 0;
    let deviceSaveUSB = 0;
    let deviceSaveSerial = "";
    const temperatureString = "d";
    let startTime = 0;
    let autoSave = 0;
    returnObj.neoRADIO_status = 0;

    let TempUnit = "&#176C";
    if(settings.get("tempUnit"))
    {
        if(settings.get("tempUnit") == 1)
        {
            TempUnit = "&#176F";
        }
    }

    if(settings.get("save") && settings.get("save") == "1")
    {
        autoSave = 1;
    }

    EmitEvents.from.on('error_msg', msg => {
        switch (msg) {
            case "100":
                worker.closeInput();
                terminateAll();
                change_error_text("Device failed to connect, please check physical connection");
                break;
            case "101":
                worker.closeInput();
                terminateAll();
                change_error_text("No devices found, please try again");
                break;
            case "102":
                change_error_text('Connection timed out. Please try reconnecting');
                break;
            case "200":
                change_error_text('Write settings failed');
                break;
            case "300":
                change_error_text('Store calibration data failed');
                $("#storeButton").prop('disabled',false);
                break;
        }
    });

    EmitEvents.from.on('killall', () => {
        console.log("connection terminated");
        terminateAll();
    });

    EmitEvents.from.on('paused', () => {
        console.log("paused");
    });

    EmitEvents.from.on('device_found', device_found => {
        returnObj.device_found = JSON.parse(device_found);
        if(device_found != "null" && device_found_once === 0)
        {
            showConnected(returnObj.device_found);
            readSettings(returnObj.device_found);
            device_found_once = 1;
            returnObj.neoRADIO_status = 1;
            $('#device_connect').prop('disabled',false);
            $("html,body").removeClass('wait');
        }
    });

    EmitEvents.from.on('data_stream', data_stream => {
        processRawData(JSON.parse(data_stream));
    });

    EmitEvents.from.on('settings_reply_count', settings_reply_count => {
        change_status_text(`${deviceSaveSerial} Saving in progress ${((parseInt(settings_reply_count) + 1) * 12.5).toFixed(0)}%`,9000);
    });

    EmitEvents.from.on('settings_reply', settings_reply => {
        if(!settings_reply)
        {
            change_error_text('Reload Failed');
            return;
        }
        returnObj.device_found = JSON.parse(settings_reply);
        reloadSettings(JSON.parse(settings_reply));
        $("html,body").removeClass('wait');
        $('.device_save').prop('disabled',false);
        $('.device_save_canhub').prop('disabled',false);
        $('.device_default').prop('disabled',false);
        $('#device_startlog').prop('disabled',false);
    });

    EmitEvents.from.on('cal_read', data_stream => {
        data_stream = JSON.parse(data_stream);
        $("#readButton").prop('disabled',false);
        if(data_stream)
        {
            $('.cal_table_tc_tables').html('');

            let data_length = Object.keys(data_stream['data']).length;
            for(let i = 0; i < data_length; i++)
            {
                if(data_stream['data'][i]['calpoints'] == "invalid" || data_stream['data'][i]['calpoints'] == null)
                {
                    change_error_text('Calibration data invalid, please Clear data first');
                    return;
                }
            }

            $('.cal_table_tc').removeClass('hidden');
            if($("#removeButton").attr('data-toggle') == 'cancel')
            {
                editRow();
            }
            $(".ma_calibration button").prop('disabled',false);

            switch (data_stream["type"]) {
                case 0:
                    $('.cal_table_tc_tables').append(append_cal_table(data_stream));
                    $('.cal_table_').removeClass("hidden");
                    $('.interactive_wrapper').removeClass("hidden");
                    break;
                case 3:
                    let AIN_range = parseInt($('.cal_ain_range').find('.ain_select').val());
                    $('.cal_table_tc_tables').append(append_cal_table(data_stream));
                    $(`#cal_table_${AIN_range}`).removeClass("hidden");
                    $('.interactive_wrapper').removeClass("hidden");
                    break;
                case 4:
                    $('.cal_table_tc_tables').append(append_cal_table_aout(data_stream));
                    $('.cal_table_').removeClass("hidden");
                    $('.interactive_wrapper').addClass("hidden");
                    break;
                default:
                    break;
            }

            difference();
        }
        else
        {
            change_error_text('Read calibration data failed');
        }
    });

    EmitEvents.from.on('cal_settings', data_stream => {
        if(data_stream && data_stream == "OK")
        {
            $("html,body").removeClass('wait');
            change_status_text('Calibration stored');
            $("#storeButton").prop('disabled',false);
            readnative();
        }
        else if(data_stream && data_stream != "OK")
        {
            if(parseInt(data_stream) < 10)
            {
                change_status_text(`Storing in progress ${((parseInt(data_stream) + 1) * 16.6).toFixed(0)}%`,9000);
            }
            else
            {
                change_status_text(`Storing in progress ${((parseInt(data_stream) - 9) * 12.5).toFixed(0)}%`,9000);
            }
        }
    });

    EmitEvents.from.on('cal_inter', data_stream => {
        if(data_stream == "error")
        {
            if($('.ma_calibration .input_selector_bg').find('.input_selector_value').val() == "1")
            {
                $('.ma_calibration .input_selector_bg').find('.input_selector').animate({left:-1}, {
                    duration: 0,
                    complete: () => {
                        $('.ma_calibration .input_selector_bg').prev().addClass("offline");
                        $('.ma_calibration .input_selector_bg').next().removeClass("online");
                        $('.ma_calibration .input_selector_bg').find('.input_selector_value').val("0");
                        $('.cal_table_tc').off('focus','.cal_me');
                    }
                });
            }
            change_error_text('Read error');
            return;
        }

        data_stream = JSON.parse(data_stream);
        $(".calibration_bank").text(data_stream['bank'] + 1);
        let me_data = parseFloat(data_stream['tempData']);
        if(me_data != null)
        {
            if($(document.activeElement).attr('data-bank') != (data_stream['bank'] + 1))
            {
                return;
            }

            let first = parseFloat($(document.activeElement).closest('tr').find('.cal_input_th').val());
            let final;

            switch (data_stream['type']) {
                case 0:
                    if(me_data == -1000)
                    {
                        $(document.activeElement).next().val("Disconnected");
                        return;
                    }
                    $(document.activeElement).val(parseFloat(me_data.toFixed(1)));
                    final = parseFloat(first - me_data).toFixed(1);
                    break;
                case 3:
                    if(data_stream['range'] < 4)
                    {
                        $(document.activeElement).val((me_data * 1000).toFixed(3));
                        final = (first - (me_data * 1000)).toFixed(3);
                    }
                    else
                    {
                        $(document.activeElement).val((me_data).toFixed(4));
                        final = (first - me_data).toFixed(4);
                    }
                    break;
            }

            $(document.activeElement).next().val(final);
        }
    });

    EmitEvents.from.on('cal_clear', data_stream => {
        $("#resetCalButton").prop('disabled',false).removeClass("disabled");
        if(data_stream && data_stream == "done")
        {
            change_status_text('Calibration data cleared');
            readnative();
        }
        else
        {
            change_error_text('Clear calibration data failed');
        }
    });

    EmitEvents.from.on('default_loaded', data_stream => {
        if(data_stream && data_stream == "OK")
        {
            change_status_text('Default settings loaded');
        }
        else
        {
            change_error_text('Load default settings failed');
        }
        $("html,body").removeClass('wait');
    });

    returnObj.close = () => {
        worker.closeInput();
        terminateAll();
    };

    returnObj.checkOnlineDevices = () => {
        if(device_found_once === 0)
        {
            EmitEvents.to.emit(1, 1);
        }
    };

    returnObj.startDataPush = () => {
        EmitEvents.to.emit(3, 3);
        returnObj.neoRADIO_status = 2;
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
    };

    returnObj.SetPwrRly = function(that){
        if(returnObj.neoRADIO_status == 2)
        {
            EmitEvents.to.emit(0, "0");
        }

        let usbIndex = parseInt($(that).attr('data-usb'));
        let type = parseInt($(that).attr('data-type'));
        let deviceID = parseInt($(that).attr('data-number'));
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
        ExtraArray[0] = parseInt(returnObj.device_found[`usb${usbIndex}`]['PWRRLY_STATUS'][parseInt(deviceID) - 1]);

        let settingsHere = {
            usbIndex: usbIndex,
            deviceType: type,
            deviceLink: deviceID - 1,
            extraSettings: ExtraArray
        };

        let JSONstr = JSON.stringify(settingsHere);
        EmitEvents.to.emit(9, JSONstr);
    };

    returnObj.SetAoutValue = function(that, bank){
        let usbIndex = parseInt($(that).attr('data-usb'));
        let deviceID = parseInt($(that).attr('data-number'));
        let ExtraArray = [0, 0, 0];
        let channel1 = parseFloat($(that).find(`.device_channel${bank} .neorad_aout_input_1`).val());
        let channel2 = parseFloat($(that).find(`.device_channel${bank} .neorad_aout_input_2`).val());
        let channel3 = parseFloat($(that).find(`.device_channel${bank} .neorad_aout_input_3`).val());

        if(channel1 > 0 && channel1 <= 5)
        {
            ExtraArray[0] = parseInt(channel1 * 13107);
        }
        if(channel2 > 0 && channel2 <= 5)
        {
            ExtraArray[1] = parseInt(channel2 * 13107);
        }
        if(channel3 > 0 && channel3 <= 5)
        {
            ExtraArray[2] = parseInt(channel3 * 13107);
        }

        let settingsHere = {
            usbIndex: usbIndex,
            bank: parseInt(bank),
            deviceLink: deviceID - 1,
            extraSettings: ExtraArray
        };

        let JSONstr = JSON.stringify(settingsHere);
        EmitEvents.to.emit(10, JSONstr);
    };

    returnObj.gatherData = function(that){
        let type = parseInt($(that).attr('data-type'));
        let deviceID = parseInt($(that).attr('data-number'));
        let usbIndex = parseInt($(that).attr('data-usb'));
        let iloop = $(that).find('.table1 .ma_device_channel_head').length;
        let eachBankSettings = {};

        send_settings_once = 1;
        deviceSave = deviceID - 1;
        deviceSaveUSB = usbIndex;
        deviceSaveSerial = $(that).find(".ma_device_serial_span").attr('data-serial');

        switch (type)
        {
            case 2:
                let CanMode = $(that).find(`.device_channel1 .ma_device_can_mode`).val();
                let CanMsgType = $(that).find(`.device_channel1 .ma_device_can_type`).val();
                let CanMsgTypeID = $(that).find(`.device_channel1 .ma_device_can_id_type`).val();
                let CanMsgToSend;
                if (!CanMsgType)
                {
                    CanMsgType = 1;
                }
                if (CanMsgType == 1 && CanMsgTypeID == 3)
                {
                    CanMsgToSend = 0;
                }
                if (CanMsgType == 1 && CanMsgTypeID == 4)
                {
                    CanMsgToSend = 1;
                }
                if (CanMsgType == 2 && CanMsgTypeID == 3)
                {
                    CanMsgToSend = 2;
                }
                if (CanMsgType == 2 && CanMsgTypeID == 4)
                {
                    CanMsgToSend = 3;
                }
                let CanId = parseInt($(that).find(`.device_channel1 .ma_device_can_id`).val(),16);
                let CanLocation = parseInt($(that).find(`.device_channel1 .ma_device_can_byte`).val());

                if (CanMode == "1")
                {
                    CanMsgToSend = 0xFF;
                }

                let tag_name = $(that).find(`.device_channel1 .ma_device_channel_tag`).val();
                let tag_json = [];
                let tag_name_length = tag_name.length;
                for (let j = 0; j < tag_name_length; j++)
                {
                    tag_json[j] = tag_name.charCodeAt(j);
                }

                if(isNaN(CanId))
                {
                    CanId = 0;
                }

                let ExtraArray = [];
                let bString = "";
                for (let i = 1; i <= iloop; i++)
                {
                    let init_state = $(that).find(`.device_channel${i} .neorad_rly_input:checked`).val();
                    bString += init_state;
                }
                ExtraArray[0] = bString.split("");
                ExtraArray[0] = ExtraArray[0].reverse();
                bString = ExtraArray[0].join("");
                ExtraArray[0] = parseInt(bString, 2);

                eachBankSettings = {
                    usbIndex: parseInt(usbIndex),
                    bank: 0,
                    enables: 1,
                    reportRate: 100,
                    deviceType: 2,
                    deviceLink: deviceID - 1,
                    tagName: tag_json,
                    CanId: CanId,
                    CanMsgType: CanMsgToSend,
                    CanLocation: CanLocation,
                    extraSettings: ExtraArray
                };

                EmitEvents.to.emit(4, JSON.stringify(eachBankSettings));
                break;
            case 5:
                eachBankSettings = {
                    usbIndex: parseInt(usbIndex),
                    bank: 0x01,
                    enables: 0x01,
                    reportRate: 100,
                    deviceType: 5,
                    deviceLink: deviceID,
                    tagName:[],
                    CanId: 0,
                    CanMsgType: 0,
                    CanLocation: 0,
                    extraSettings: [[0,1],[2,3],[4,5]]
                };

                EmitEvents.to.emit(4, JSON.stringify(eachBankSettings));
                break;
            default:
                for (let i = 1; i <= iloop; i++)
                {
                    let check_stat = $(that).find(`.device_channel${i} .ma_device_channel_status`).prev().prop('checked');
                    let sample_stat = $(that).find(`.device_channel${i} .ma_device_channel_pullrate`).val();
                    sample_stat = parseInt(sample_stat);

                    let CanMode = $(that).find(`.device_channel${i} .ma_device_can_mode`).val();
                    let CanMsgType = $(that).find(`.device_channel${i} .ma_device_can_type`).val();
                    let CanMsgTypeID = $(that).find(`.device_channel${i} .ma_device_can_id_type`).val();
                    let CanMsgToSend;
                    if (!CanMsgType)
                    {
                        CanMsgType = 1;
                    }
                    if (CanMsgType == 1 && CanMsgTypeID == 3)
                    {
                        CanMsgToSend = 0;
                    }
                    if (CanMsgType == 1 && CanMsgTypeID == 4)
                    {
                        CanMsgToSend = 1;
                    }
                    if (CanMsgType == 2 && CanMsgTypeID == 3)
                    {
                        CanMsgToSend = 2;
                    }
                    if (CanMsgType == 2 && CanMsgTypeID == 4)
                    {
                        CanMsgToSend = 3;
                    }
                    let CanId = parseInt($(that).find(`.device_channel${i} .ma_device_can_id`).val(),16);
                    let CanLocation = parseInt($(that).find(`.device_channel${i} .ma_device_can_byte`).val());

                    if (CanMode == "1")
                    {
                        CanMsgToSend = 0xFF;
                    }

                    let tag_name = $(that).find(`.device_channel${i} .ma_device_channel_tag`).val();
                    let tag_json = [];
                    let tag_name_length = tag_name.length;
                    for (let j = 0; j < tag_name_length; j++)
                    {
                        tag_json[j] = tag_name.charCodeAt(j);
                    }

                    if (sample_stat < 5 || !sample_stat)
                    {
                        sample_stat = 5;
                    }

                    if (sample_stat > 216000000)
                    {
                        sample_stat = 216000000;
                    }

                    if(isNaN(CanId))
                    {
                        CanId = 0;
                    }

                    let ExtraArray = [];

                    switch (type)
                    {
                        case 0:
                            if (check_stat)
                            {
                                check_stat = 1;
                            }
                            else
                            {
                                check_stat = 0;
                            }
                            break;
                        case 3:
                            if (check_stat)
                            {
                                let AIN_select = $(that).find(`.device_channel${i} .neorad_ain_sample_input:checked`).val();
                                if (AIN_select == "low")
                                {
                                    check_stat = $(that).find(`.device_channel${i} .ain_low_select`).val();
                                }
                                else if (AIN_select == "high")
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
                            let check_stat1 = $(that).find(`.device_channel${i} .device_check_status1`).prop('checked');
                            let check_stat2 = $(that).find(`.device_channel${i} .device_check_status2`).prop('checked');
                            let check_stat3 = $(that).find(`.device_channel${i} .device_check_status3`).prop('checked');

                            let ch1_init_value = $(that).find(`.device_channel${i} .neorad_aout_initinput_1`).val();
                            let ch2_init_value = $(that).find(`.device_channel${i} .neorad_aout_initinput_2`).val();
                            let ch3_init_value = $(that).find(`.device_channel${i} .neorad_aout_initinput_3`).val();

                            let ch1_v = 0;
                            let ch2_v = 0;
                            let ch3_v = 0;

                            if(ch1_init_value >=0 && ch1_init_value <=5)
                            {
                                ch1_v = ch1_init_value * 13107;
                            }
                            else
                            {
                                $(that).find(`.device_channel${i} .neorad_aout_initinput_1`).val('')
                            }

                            if(ch2_init_value >=0 && ch2_init_value <=5)
                            {
                                ch2_v = ch2_init_value * 13107;
                            }
                            else
                            {
                                $(that).find(`.device_channel${i} .neorad_aout_initinput_2`).val('');
                            }

                            if(ch3_init_value >=0 && ch3_init_value <=5)
                            {
                                ch3_v = ch3_init_value * 13107;
                            }
                            else
                            {
                                $(that).find(`.device_channel${i} .neorad_aout_initinput_3`).val('');
                            }

                            ExtraArray = [check_stat1 ? 1 : 0, check_stat2 ? 1 : 0, check_stat3 ? 1 : 0, ch1_v ? ch1_v : 0, ch2_v ? ch2_v : 0, ch3_v ? ch3_v : 0];
                            break;
                        default:
                            break;
                    }

                    eachBankSettings = {
                        usbIndex: parseInt(usbIndex),
                        bank: i - 1,
                        enables: parseInt(check_stat),
                        reportRate: sample_stat,
                        deviceType: type,
                        deviceLink: deviceID - 1,
                        tagName: tag_json,
                        CanId: CanId,
                        CanMsgType: CanMsgToSend,
                        CanLocation: CanLocation,
                        extraSettings: ExtraArray
                    };

                    EmitEvents.to.emit(4, JSON.stringify(eachBankSettings));
                }
                break;
        }
    };

    returnObj.getCanSettings = function(that){
        let type = parseInt($(that).attr('data-type'));
        let deviceID = $(that).find('.ma_device_serial_span').attr('data-serial');
        let deviceNumber = parseInt($(that).attr('data-number'));
        let usbDevice = parseInt($(that).attr('data-usb')) + 1;
        let iloop = $(that).find('.table1 .ma_device_channel_head').length;
        let can_settings = {
            "data":{}
        };
        can_settings['type'] = type;
        can_settings['deviceID'] = deviceID;
        can_settings["arb_array"] = [];
        can_settings["byte_array"] = [];

        for (let i = 0; i < iloop; i++)
        {
            let CanMode = $(that).find(`.device_channel${i+1} .ma_device_can_mode`).val();
            let CanMsgType = $(that).find(`.device_channel${i+1} .ma_device_can_type`).val();
            let CanMsgTypeID = $(that).find(`.device_channel${i+1} .ma_device_can_id_type`).val();
            let Tagname = $(that).find(`.device_channel${i+1} .ma_device_channel_tag`).val();

            //fixes tagnames with blank spaces. issue 27
            Tagname = Tagname.replace(/ /g,"_");
            //fixes tagnames with blank spaces. issue 27 end
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
            let CanId = $(that).find(`.device_channel${i+1} .ma_device_can_id`).val();
            let CanLocation = $(that).find(`.device_channel${i+1} .ma_device_can_byte`).val();

            if(CanMode == "1")
            {
                CanId = usbDevice * 100 + deviceNumber * 10 + (i + 1);
                CanLocation = 0;
                CanMsgTypeID = 4;
            }

            can_settings["data"][i] = {};
            can_settings["data"][i]['CanMsgType'] = parseInt(CanMsgType); // 1 Classic 2 FD
            can_settings["data"][i]['CanMsgStdXtd'] = parseInt(CanMsgTypeID); // 3 Std 4 Xtd
            can_settings["data"][i]['ArbId'] = parseInt(CanId,16); //parse hex
            can_settings["data"][i]['ByteStart'] = parseInt(CanLocation);
            can_settings["data"][i]['Tagname'] = Tagname;
            can_settings["arb_array"].push(parseInt(CanId,16));
            can_settings["byte_array"].push(parseInt(CanLocation));
        }

        return can_settings;
    };

    function showConnected(device_found){
        let usbDeviceLength = Object.keys(device_found).length;
        $('#device_serial').html('');
        let totalDevice = 0;
        for(let usbIndex = 0; usbIndex < usbDeviceLength; usbIndex++)
        {
            let usbKey = `usb${usbIndex}`;
            let errorCode = device_found[usbKey].error_code;
            if (errorCode == "102")
            {
                change_error_text(`${usbKey} read failed. Please try reconnecting`);
            }
            let deviceConnected = device_found[usbKey].maxID_Device;
            let deviceState = device_found[usbKey].State;
            let devices = [];
            if(deviceState == 6)
            {
                totalDevice += deviceConnected;
                for (let i = 0; i < deviceConnected; i++)
                {
                    devices[i] = {
                        deviceType : device_found[usbKey]['chainlist'][`device${i}`]['channel0']['deviceType'],
                        serialNumber : device_found[usbKey]['serialNumber'][i],
                    };

                    let deviceObject = {
                        deviceType : device_found[usbKey]['chainlist'][`device${i}`]['channel0']['deviceType'],
                        serialNumber : device_found[usbKey]['serialNumber'][i],
                        manufacture_year : device_found[usbKey]['manufacture_year'][i],
                        manufacture_month : device_found[usbKey]['manufacture_month'][i],
                        manufacture_day : device_found[usbKey]['manufacture_day'][i],
                        firmwareVersion_major : device_found[usbKey]['firmwareVersion_major'][i],
                        firmwareVersion_minor : device_found[usbKey]['firmwareVersion_minor'][i],
                        hardwareRev_major : device_found[usbKey]['hardwareRev_major'][i],
                        hardwareRev_minor : device_found[usbKey]['hardwareRev_minor'][i],
                    };

                    let AppendTemplate;
                    switch (deviceObject.deviceType)
                    {
                        case 1:
                            let dio_template = require("../js/dio_template");
                            AppendTemplate = dio_template.generate_template(deviceObject,i);
                            dio_template.events();
                            break;
                        default:
                            AppendTemplate = template1(deviceObject,i);
                            break;
                    }

                    $(".ma_device .table-responsive-sm").append(`<div class="ma_device_wrap usb${usbIndex} usb${usbIndex}_device${i}" 
                    data-type="${deviceObject.deviceType}" data-number="${i+1}" data-usb="${usbIndex}">${AppendTemplate}</div>`);
                }
            }

            if(settings.get("cal") && settings.get("cal") == 1)
            {
                $.each(devices, function (i, item) {
                    if(item.deviceType == 0 || item.deviceType == 3 || item.deviceType == 4)
                    {
                        $('#device_serial').append($('<option>', {
                            value: item.deviceType,
                            text : item.serialNumber,
                            "data-index" : i,
                            "data-usb": usbIndex
                        }));
                    }
                });
            }
        }

        PlotSeries.maxD = PlotHistory.maxD = totalDevice;
        $('#device_connect').prop('disabled',true).addClass('hidden');
        $('#device_startlog').removeClass('disabled hidden').prop('disabled',false);
        $('#device_reload').removeClass('hidden');
        $("#readButton").prop('disabled',false);
        $("#importButton").prop('disabled',false);
        $("#resetCalButton").prop('disabled',false);
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
        start_get_data = 1;

        $(".ma_calibration button").prop('disabled',true);
        if(settings.get("cal") && settings.get("cal") == 1)
        {
            $('.nav_calibration').addClass('hidden');
        }
        $('.nav_setting').off();
        $('.nav_setting').on('click',function ()
        {
            $('.nav_setting > .nav-link-click').blur();
        })
    }

    function readSettings(raw) {
        let usbDeviceLength = Object.keys(raw).length;
        for(let usbIndex = 0; usbIndex < usbDeviceLength; usbIndex++)
        {
            let usbKey = `usb${usbIndex}`;
            let max_device = raw[usbKey].maxID_Device;
            let init_warning = "Warning!";
            let init_warning_status = false;
            let deviceState = raw[usbKey].State;
            if(deviceState == 6)
            {
                PlotSeries.data[usbIndex] = [];
                PlotHistory.data[usbIndex] = [];
                for (let i = 0; i < max_device; i++)
                {
                    for (let j = 0; j < 8; j++)
                    {
                        PlotSeries.data[usbIndex][(i * 8) + j] = [];
                        PlotHistory.data[usbIndex][(i * 8) + j] = [];

                        let ChipOnDevice = j + 1;
                        let EnableStatus = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settingsEnables'];
                        let ReportRate = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settingsReportRate'];
                        let deviceType = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['deviceType'];
                        let canArbid = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settingsCanArbid'];
                        let canLocation = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settingsCanLocation'];
                        let canMsgType = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settingsCanMsgType'];
                        let canType, canIdType;

                        switch (canMsgType)
                        {
                            case 0:
                                canType = 1;
                                canIdType = 3;
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_mode`).val("0");
                                break;
                            case 1:
                                canType = 1;
                                canIdType = 4;
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_mode`).val("0");
                                break;
                            case 2:
                                canType = 2;
                                canIdType = 3;
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_mode`).val("0");
                                break;
                            case 3:
                                canType = 2;
                                canIdType = 4;
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_mode`).val("0");
                                break;
                            case 255:
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_mode`).val("1");
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_type`).prop("disabled", true);
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_id_type`).prop("disabled", true);
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_id`).prop("disabled", true);
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_byte`).prop("disabled", true);
                                break;
                        }

                        $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_type`).val(canType);
                        $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_id_type`).val(canIdType);
                        $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_id`).val(canArbid.toString(16));
                        $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_can_byte`).val(canLocation);

                        let tagName = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settingsNameArray'];
                        let tagNameString = "";
                        let tag_name_length = tagName.length;
                        for (let k = 0; k < tag_name_length; k++)
                        {
                            tagNameString += String.fromCharCode(tagName[k]);
                        }

                        PlotSeries.enables.push(EnableStatus);

                        if (EnableStatus > 0)
                        {
                            $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_channel_status`).prev().prop('checked', true);
                        }
                        else
                        {
                            $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_channel_status`).prev().prop('checked', false);
                        }

                        $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_channel_pullrate`).val(ReportRate);
                        if (ReportRate == 10 ||
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
                            $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .device_check_pullrate_select option[value="${ReportRate}"]`).prop('selected', true);
                        }
                        else
                        {
                            $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .device_check_pullrate_select option[value="0"]`).prop('selected', true);
                            $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_channel_pullrate`).prop('disabled', false);
                            $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_channel_pullrate`).parent().removeClass('opacity');
                        }

                        if (tagName && tagName != "")
                        {
                            $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ma_device_channel_tag`).val(tagNameString);
                        }

                        switch (deviceType)
                        {
                            case 2:
                                $(`.usb${usbIndex}_device${i} .ma_device_wrap[data-type="2"] .device_default`).addClass('hidden').prop('disabled', true);
                                if (raw[usbKey]['PWRRLY_STATUS'][i])
                                {
                                    let movePixel = $('.input_selector').width();
                                    let bStatus = parseInt(raw[usbKey]['PWRRLY_STATUS'][i]).toString(2);
                                    let arrayholder = bStatus.split("");
                                    arrayholder = arrayholder.reverse();
                                    bStatus = arrayholder.join("");
                                    let bstatus_length = bStatus.length;
                                    for (let k = 0; k < bstatus_length; k++)
                                    {
                                        if (bStatus[k] == 1)
                                        {
                                            $(`.usb${usbIndex}_device${i} .device_channel${k + 1} #rly_on_${i}_${k + 1}`).prop('checked', true);
                                            let currentSelector = $(`.usb${usbIndex}_device${i} .device_channel${k + 1} #input_selector_bg_${i}_${k + 1}`);
                                            let currentValue = $(currentSelector).find('.input_selector_value').val();
                                            if (currentValue == "0")
                                            {
                                                $(currentSelector).find('.input_selector').animate({left: (movePixel * 0.87)}, {
                                                    duration: 0,
                                                    complete: () =>
                                                    {
                                                        $(currentSelector).prev().removeClass("offline");
                                                        $(currentSelector).next().addClass("online");
                                                        $(currentSelector).find('.input_selector_value').val("1");
                                                    }
                                                });
                                            }
                                            else if (currentValue == "1")
                                            {
                                                $(currentSelector).find('.input_selector').animate({left: -1}, {
                                                    duration: 0,
                                                    complete: () =>
                                                    {
                                                        $(currentSelector).prev().addClass("offline");
                                                        $(currentSelector).next().removeClass("online");
                                                        $(currentSelector).find('.input_selector_value').val("0");
                                                    }
                                                });
                                            }
                                        }
                                    }
                                }

                                if(EnableStatus >= 0 && EnableStatus < 256)
                                {
                                    let bStatus = parseInt(EnableStatus).toString(2);
                                    let arrayholder = bStatus.split("");
                                    arrayholder = arrayholder.reverse();
                                    bStatus = arrayholder.join("");
                                    for (let k = 0; k < 8; k++)
                                    {
                                        if (bStatus[k] == 1)
                                        {
                                            $(`.usb${usbIndex}_device${i} .device_channel${k + 1} #rly_on_${i}_${k + 1}`).prop('checked', true);
                                        }
                                        else
                                        {
                                            $(`.usb${usbIndex}_device${i} .device_channel${k + 1} #rly_off_${i}_${k + 1}`).prop('checked', true);
                                        }
                                    }
                                }
                                break;
                            case 3:
                                if (EnableStatus > 0 && EnableStatus < 4)
                                {
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ain_low_select option[value=${EnableStatus}]`).prop('selected', true);
                                }
                                else if (EnableStatus > 3 && EnableStatus < 7)
                                {
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .neorad_ain_sample_input[value="high"]`).prop("checked", true);
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ain_low_select`).addClass('hidden');
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ain_high_select`).removeClass('hidden');
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .ain_high_select option[value=${EnableStatus}]`).prop('selected', true);
                                }
                                break;
                            case 4:
                                let settings1_enable = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settings1']['enabled'];
                                let settings2_enable = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settings2']['enabled'];
                                let settings3_enable = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settings3']['enabled'];

                                if (settings1_enable > 0)
                                {
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .device_check_status1`).prop('checked', true);
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .neorad_aout_input_1`).prop('disabled', false);
                                }
                                else
                                {
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .device_check_status1`).prop('checked', false);
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .neorad_aout_input_1`).prop('disabled', true);
                                }

                                if (settings2_enable > 0)
                                {
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .device_check_status2`).prop('checked', true);
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .neorad_aout_input_2`).prop('disabled', false);
                                }
                                else
                                {
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .device_check_status2`).prop('checked', false);
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .neorad_aout_input_2`).prop('disabled', true);
                                }

                                if (settings3_enable > 0)
                                {
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .device_check_status3`).prop('checked', true);
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .neorad_aout_input_3`).prop('disabled', false);
                                }
                                else
                                {
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .device_check_status3`).prop('checked', false);
                                    $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .neorad_aout_input_3`).prop('disabled', true);
                                }

                                let initOutputValue1 = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settings1']['initOutputValue'];
                                let initOutputValue2 = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settings2']['initOutputValue'];
                                let initOutputValue3 = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settings3']['initOutputValue'];

                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .neorad_aout_initinput_1`).val((initOutputValue1 / 13107).toFixed(4));
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .neorad_aout_initinput_2`).val((initOutputValue2 / 13107).toFixed(4));
                                $(`.usb${usbIndex}_device${i} .device_channel${ChipOnDevice} .neorad_aout_initinput_3`).val((initOutputValue3 / 13107).toFixed(4));
                                break;
                        }
                    }

                    if (raw[usbKey]['chainlist'][`device${i}`]['channel0']['notInit'] == 1)
                    {
                        init_warning += ` Device ${i + 1} not initialized. `;
                        init_warning_status = true;
                    }
                }
            }

            if (parseInt($('#device_serial option:selected').val()) == 3)
            {
                $('.ma_calibration .neorad_ain_sample').removeClass('hidden');
            }
            else
            {
                $('.ma_calibration .neorad_ain_sample').addClass('hidden');
            }

            if (init_warning_status)
            {
                change_error_text(init_warning);
            }
        }
    }

    function processRawData(raw) {
        let usbDeviceLength = Object.keys(returnObj.device_found).length;
        let time_running = 0;
        for(let usbIndex = 0; usbIndex < usbDeviceLength; usbIndex++)
        {
            let usbKey = `usb${usbIndex}`;
            let rawObj = {};
            if(raw[usbKey])
            {
                let max_device = raw[usbKey].maxID_Device;
                if(time_running < raw[usbKey]['Timeus'])
                {
                    time_running = raw[usbKey]['Timeus'];
                }

                for (let i = 0; i < max_device; i++)
                {
                    let deviceType = raw[usbKey][i]['deviceType'];
                    if(deviceType == 0 || deviceType == 3)
                    {
                        for (let j = 1; j < 9; j++)
                        {
                            let measured_value;
                            let displayString;
                            let channelValue = raw[usbKey][i][j - 1];
                            let enables = returnObj.device_found[usbKey]['chainlist'][`device${i}`][`channel${j-1}`]['settingsEnables'];
                            if (raw[usbKey][i] && enables)
                            {
                                switch (deviceType)
                                {
                                    case 0:
                                        measured_value = temperatureConversion(channelValue);
                                        if (measured_value !== undefined && measured_value !== temperatureString)
                                        {
                                            displayString = `${(measured_value.toFixed(1))}${TempUnit}`;
                                        }

                                        if (measured_value === temperatureString)
                                        {
                                            $(`.usb${usbIndex}_device${i} .device_channel${j} .ma_device_channel_temp`).html(def_lang.text_disc).removeClass("em15 online").addClass("em1 offline");
                                            $(`#gsbData_${usbIndex}_${i}_${j}`).html(def_lang.text_disc).removeClass("online").addClass("offline");
                                        }
                                        else if (measured_value !== undefined)
                                        {
                                            $(`.usb${usbIndex}_device${i} .device_channel${j} .ma_device_channel_temp`).html(displayString).addClass('em15 online').removeClass("em1 offline");
                                            $(`#gsbData_${usbIndex}_${i}_${j}`).html(displayString).addClass('online').removeClass("offline");
                                        }
                                        break;
                                    case 3:
                                        if ($(`input[name="ain_${i}_b${j}"]:checked`).val() == "low")
                                        {
                                            measured_value = voltageConversion(channelValue);
                                            if (measured_value != undefined && measured_value != "d" && measured_value != "error")
                                            {
                                                measured_value *= 1000;
                                                displayString = `${(measured_value).toFixed(3)}mV`;
                                                $(`.usb${usbIndex}_device${i} .device_channel${j} .ma_device_channel_temp`).html(displayString).addClass('em15 online').removeClass("em1 offline");
                                                $(`#gsbData_${usbIndex}_${i}_${j}`).html(displayString).addClass('online').removeClass("offline");
                                            }
                                            else if (measured_value == "error")
                                            {
                                                displayString = "Over Range";
                                                $(`.usb${usbIndex}_device${i} .device_channel${j} .ma_device_channel_temp`).html(displayString).addClass('em15 online').removeClass("em1 offline");
                                                $(`#gsbData_${usbIndex}_${i}_${j}`).html(displayString).addClass('online').removeClass("offline");
                                            }
                                        }
                                        else if ($(`input[name="ain_${i}_b${j}"]:checked`).val() == "high")
                                        {
                                            measured_value = voltageConversion(channelValue);
                                            if (measured_value != undefined && measured_value != "d" && measured_value != "error")
                                            {
                                                displayString = `${measured_value.toFixed(4)}V`;
                                                $(`.usb${usbIndex}_device${i} .device_channel${j} .ma_device_channel_temp`).html(displayString).addClass('em15 online').removeClass("em1 offline");
                                                $(`#gsbData_${usbIndex}_${i}_${j}`).html(displayString).addClass('online').removeClass("offline");
                                            }
                                            else if (measured_value == "error")
                                            {
                                                displayString = "Over Range";
                                                $(`.usb${usbIndex}_device${i} .device_channel${j} .ma_device_channel_temp`).html(displayString).addClass('em15 online').removeClass("em1 offline");
                                                $(`#gsbData_${usbIndex}_${i}_${j}`).html(displayString).addClass('online').removeClass("offline");
                                            }
                                        }
                                        break;
                                }

                                if (measured_value != temperatureString && measured_value != undefined && measured_value != null)
                                {
                                    let time_us = exportTime(time_running);
                                    let array_pst = (i * 8) + (j - 1);

                                    if(typeof measured_value != "number")
                                    {
                                        measured_value = 0;
                                    }

                                    PlotSeries.time = [time_us];
                                    PlotSeries.data[usbIndex][array_pst].pop();
                                    PlotSeries.data[usbIndex][array_pst].push(measured_value);

                                    let len = PlotHistory.time.length;
                                    PlotHistory.data[usbIndex][array_pst][len] = measured_value;
                                    if(PlotHistory.time[PlotHistory.time.length - 1] !== time_us)
                                    {
                                        PlotHistory.time.push(time_us);
                                    }

                                    if(len > 80000)
                                    {
                                        console.time('reduce');
                                        let len1 = len;
                                        while (len1--)
                                        {
                                            if(len1 % 4 === 0)
                                            {
                                                PlotHistory.time.splice(len1, 3);
                                            }
                                        }

                                        for (let i = 0; i < max_device; i++)
                                        {
                                            for (let j = 0; j < 8; j++)
                                            {
                                                let len2 = len;
                                                while (len2--)
                                                {
                                                    if (len2 % 4 === 0)
                                                    {
                                                        PlotHistory.data[usbIndex][j + (i * 8)].splice(len2, 3);
                                                    }
                                                }

                                                while (PlotHistory.data[usbIndex][j + (i * 8)].length > 10000)
                                                {
                                                    PlotHistory.data[usbIndex][j + (i * 8)].pop();
                                                }
                                            }
                                        }

                                        if (autoSave)
                                        {
                                            let date = new Date();
                                            let month = date.getMonth() + 1;
                                            let day = date.getDate();
                                            let Minutes = date.getMinutes();
                                            if(Minutes < 10)
                                            {
                                                Minutes = `0${Minutes}`;
                                            }
                                            let end = `${date.getHours()}.${Minutes}`;

                                            let Path = path.join(mypath, `IntrepidCS\/neoRAD-IO2\/PlotHistory\/${month}-${day} ${startTime}-${end}.json`);
                                            addSelectOption(`${month}-${day} ${startTime}-${end}`);
                                            console.log(PlotHistory);
                                            fs.writeFile(Path, JSON.stringify(PlotHistory), err => {
                                                if (err) throw err;
                                                PlotHistory.time = [];
                                                PlotHistory.data[usbIndex][array_pst] = [];
                                            });
                                            startTime = end;
                                        }
                                        else
                                        {
                                            PlotHistory.time = [];
                                            PlotHistory.data[usbIndex][array_pst] = [];
                                        }

                                        console.timeEnd('reduce');
                                    }
                                }
                            }

                            if (measured_value === temperatureString)
                            {
                                rawObj['time'] = exportTime(time_running);
                                rawObj[`usb_${usbIndex}_device${i + 1}_bank${j}`] = temperatureString;
                            }
                            else if (measured_value !== undefined)
                            {
                                rawObj['time'] = exportTime(time_running);
                                switch (deviceType)
                                {
                                    case 0:
                                        rawObj[`usb_${usbIndex}_device${i + 1}_bank${j}`] = parseFloat(measured_value.toFixed(1));
                                        break;
                                    case 3:
                                        rawObj[`usb_${usbIndex}_device${i + 1}_bank${j}`] = measured_value;
                                        break;
                                }
                            }
                        }
                    }
                }
            }

            if (rawObj['time'])
            {
                dumpDataFile(rawObj);
            }
        }

        $(`.ma_device_channel_time`).html(`${readableTime(time_running)}`);
    }

    function reloadSettings(raw) {
        let objvalue = Object.values(raw[`usb${deviceSaveUSB}`]["chainlist"])[deviceSave];
        let obj_length = Object.keys(objvalue).length;
        for(let i = 0; i < obj_length; i++)
        {
            let enables = Object.values(objvalue)[i]['settingsEnables'];
            let samplerate = Object.values(objvalue)[i]['settingsReportRate'];

            if(enables == 0)
            {
                $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_channel_status`).prev().prop('checked',false);
                $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_channel_temp`).text("");
            }
            else if(enables == 1)
            {
                $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_channel_status`).prev().prop('checked',true);
                $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_channel_temp`).text("");
            }

            let canArbid = Object.values(objvalue)[i]['settingsCanArbid'];
            let canLocation = Object.values(objvalue)[i]['settingsCanLocation'];
            let canMsgType = Object.values(objvalue)[i]['settingsCanMsgType'];
            let canType, canIdType;
            switch (canMsgType) {
                case 0:
                    canType = 1;
                    canIdType = 3;
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_mode`).val("0");
                    break;
                case 1:
                    canType = 1;
                    canIdType = 4;
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_mode`).val("0");
                    break;
                case 2:
                    canType = 2;
                    canIdType = 3;
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_mode`).val("0");
                    break;
                case 3:
                    canType = 2;
                    canIdType = 4;
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_mode`).val("0");
                    break;
                case 255:
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_mode`).val("1");
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_type`).prop("disabled",true);
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_id_type`).prop("disabled",true);
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_id`).prop("disabled",true);
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_byte`).prop("disabled",true);
                    break;
            }

            $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_channel_pullrate`).val(samplerate);
            if (samplerate == 10 ||
                samplerate == 20 ||
                samplerate == 50 ||
                samplerate == 100 ||
                samplerate == 200 ||
                samplerate == 500 ||
                samplerate == 1000 ||
                samplerate == 2000 ||
                samplerate == 5000
            )
            {
                $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .device_check_pullrate_select option[value="${samplerate}"]`).prop('selected', true);
            }
            else
            {
                $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .device_check_pullrate_select option[value="0"]`).prop('selected', true);
                $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_channel_pullrate`).prop('disabled', false);
                $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_channel_pullrate`).parent().removeClass('opacity');
            }

            let tagName = Object.values(objvalue)[i]['settingsNameArray'];
            let tagNameString = "";
            let tag_name_length = tagName.length;
            for (let k = 0; k < tag_name_length; k++)
            {
                tagNameString += String.fromCharCode(tagName[k]);
            }

            if(tagName && tagName != "")
            {
                $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_channel_tag`).val(tagNameString);
            }

            $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_type`).val(canType);
            $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_id_type`).val(canIdType);
            $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_id`).val(`${canArbid.toString(16)}`);
            $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ma_device_can_byte`).val(canLocation);

            switch (Object.values(objvalue)[i]['deviceType'])
            {
                case 3:
                    if (enables > 0 && enables < 4)
                    {
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ain_low_select option[value=${enables}]`).prop('selected', true);
                    }
                    else if (enables > 3 && enables < 7)
                    {
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .neorad_ain_sample_input[value="high"]`).prop("checked", true);
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ain_low_select`).addClass('hidden');
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ain_high_select`).removeClass('hidden');
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .ain_high_select option[value=${enables}]`).prop('selected', true);
                    }
                    break;
                case 4:
                    let settings1_enable = Object.values(objvalue)[i]['settings1']['enabled'];
                    let settings2_enable = Object.values(objvalue)[i]['settings2']['enabled'];
                    let settings3_enable = Object.values(objvalue)[i]['settings3']['enabled'];

                    if(settings1_enable > 0)
                    {
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .device_check_status1`).prop('checked',true);
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .neorad_aout_input_1`).prop('disabled',false);
                    }
                    else
                    {
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .device_check_status1`).prop('checked',false);
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .neorad_aout_input_1`).prop('disabled',true);
                    }

                    if(settings2_enable > 0)
                    {
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .device_check_status2`).prop('checked',true);
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .neorad_aout_input_2`).prop('disabled',false);
                    }
                    else
                    {
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .device_check_status2`).prop('checked',false);
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .neorad_aout_input_2`).prop('disabled',true);
                    }

                    if(settings3_enable > 0)
                    {
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .device_check_status3`).prop('checked',true);
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .neorad_aout_input_3`).prop('disabled',false);
                    }
                    else
                    {
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .device_check_status3`).prop('checked',false);
                        $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .neorad_aout_input_3`).prop('disabled',true);
                    }

                    let initOutputValue1 = Object.values(objvalue)[i]['settings1']['initOutputValue'];
                    let initOutputValue2 = Object.values(objvalue)[i]['settings2']['initOutputValue'];
                    let initOutputValue3 = Object.values(objvalue)[i]['settings3']['initOutputValue'];

                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .neorad_aout_initinput_1`).val((initOutputValue1 / 13107).toFixed(4));
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .neorad_aout_initinput_2`).val((initOutputValue2 / 13107).toFixed(4));
                    $(`.usb${deviceSaveUSB}_device${deviceSave} .device_channel${i+1} .neorad_aout_initinput_3`).val((initOutputValue3 / 13107).toFixed(4));
                    break;
            }
        }

        PlotSeries.enables = [];
        let usbDeviceLength = Object.keys(raw).length;
        for(let usbIndex = 0; usbIndex < usbDeviceLength; usbIndex++)
        {
            let usbKey = `usb${usbIndex}`;
            let max_device = raw[usbKey].maxID_Device;
            let deviceState = raw[usbKey].State;
            if(deviceState == 6)
            {
                for (let i = 0; i < max_device; i++)
                {
                    for(let j = 0; j < 8; j++)
                    {
                        let EnableStatus = raw[usbKey]['chainlist'][`device${i}`][`channel${j}`]['settingsEnables'];
                        PlotSeries.enables.push(EnableStatus);
                    }
                }
            }
        }

        change_status_text('Settings saved');
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
        $(".ma_device .online").removeClass("online").addClass("offline").text(def_lang.text_offline);
        $(".ma_graph .online").removeClass("online").addClass("offline").text(def_lang.text_offline);
        $('.cal_table_tc').addClass('hidden');
        if($('.ma_calibration .input_selector_bg').find('.input_selector_value').val() == "1")
        {
            $('.ma_calibration .input_selector_bg').find('.input_selector').animate({left:-1}, {
                duration: 0,
                complete: () => {
                    $('.ma_calibration .input_selector_bg').prev().addClass("offline");
                    $('.ma_calibration .input_selector_bg').next().removeClass("online");
                    $('.ma_calibration .input_selector_bg').find('.input_selector_value').val("0");
                    $('.cal_table_tc').off('focus','.cal_me');
                }
            });
        }

        $('#device_stop').addClass('disabled hidden').prop('disabled',true);
        $(".ma_device_channel_temp").text("");
        $(".ma_device_channel_time").text("");
        $(".ma_device_wrap").remove();
        clickStop();

        $('#device_connect').prop('disabled',false).removeClass('hidden');
        $('#device_startlog').prop('disabled',true).text(def_lang.device_startlog).removeClass('btn-success disabled').addClass('btn-info hidden');
        $('#device_stop').addClass('hidden');
        $('#device_reload').addClass('hidden');
        $('.device_save').addClass('hidden');
        $('.device_default').addClass('hidden');
        $('.neorad_ain_sample_input').prop('disabled',false);
        $('.ain_select').prop('disabled',false);

        $('.neorad_ain_sample').addClass('hidden');
        $(".ma_calibration button").prop('disabled',true);
        $("#device_serial option[data-index='0']").prop('selected',true);
        $(".cal_table_tc_tables").html("");

        if($('.ma_device').hasClass('hidden'))
        {
            $('.nav-link-click').blur();
            $('.nav_device').click();
        }

        if(settings.get("cal") && settings.get("cal") == 1)
        {
            $('.nav_calibration').removeClass('hidden');
        }
        $('.nav_setting').off();
        $('.nav_setting').on('click',() => {
            $('#modal_set').modal({
                keyboard: false
            });
        });

        $('.statustext span').fadeOut(0);
        if($("html,body").hasClass('wait'))
        {
            $("html,body").removeClass('wait');
        }

        returnObj.neoRADIO_status = 0;
        globalObj = {};
        plotlyInit = true;
        PlotSeries.enables = [];
    }

    returnObj.pauseAll = function () {
        $('.device_default').prop('disabled',false).removeClass('btn-warning disabled').addClass('btn-success');
        $('#device_startlog').prop('disabled',false).text(def_lang.device_startlog).removeClass('btn-success disabled').addClass('btn-info');
        $('.device_check_pullrate_select').prop('disabled',false);
        $('.ma_device_channel_tag').prop('disabled',false);
        $('.device_check_status').prop('disabled',false);
        $('.device_check_pullrate_select').each(function (index, element) {
            if($(element).val() == "0")
            {
                $(element).next().find('input').prop('disabled',false);
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
            else
            {
                $($('.ma_device_can_type')[index]).prop('disabled',true);
                $($('.ma_device_can_id_type')[index]).prop('disabled',true);
                $($('.ma_device_can_id')[index]).prop('disabled',true);
                $($('.ma_device_can_byte')[index]).prop('disabled',true);
            }
        });

        $('.neorad_ain_sample_input').prop('disabled',false);
        $('.ain_select').prop('disabled',false);

        $("#readButton").prop('disabled',false);
        $("#importButton").prop('disabled',false);
        $("#resetCalButton").prop('disabled',false);
        if($('.cal_table_tc_tables table').length > 0)
        {
            $(".ma_calibration button").prop('disabled',false);
        }

        $('.device_save').prop('disabled',false).removeClass('btn-warning disabled').addClass('btn-success');
        if(settings.get("cal") && settings.get("cal") == 1)
        {
            $('.nav_calibration').removeClass('hidden');
        }
        $('.nav_setting').on('click',() => {
            $('#modal_set').modal({
                keyboard: false
            });
        });

        EmitEvents.to.emit(0, 0);
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
        if(value === -1000 || value === null || value === undefined)
        {
            return temperatureString;
        }

        let converted = value;
        if(TempUnit == "&#176F")
        {
            converted = value * 9 / 5 + 32;
        }

        return converted;
    }

    function voltageConversion(value) {
        if(value === -1000 || value === null || value === undefined)
        {
            return temperatureString;
        }
        else if(value == "inf")
        {
            return "error";
        }

        return value;
    }

    returnObj.readCalSettings = () => {
        let tableOBJ = {
            usbIndex: parseInt($('#device_serial option:selected').attr('data-usb')),
            device: parseInt($('#device_serial option:selected').attr('data-index')),
            type: parseInt($('#device_serial option:selected').val()),
            deviceChannel: 0,
            deviceRange: 0
        };

        EmitEvents.to.emit(6, JSON.stringify(tableOBJ));
    };

    returnObj.saveCal = () => {
        let tablelength = $(".cal_table_").length;
        for(let i = 0; i < tablelength; i++)
        {
            let tableOBJ = {
                usbIndex: parseInt($('#device_serial option:selected').attr('data-usb')),
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

            let th_length = $(`#cal_table_${i+1} .cal_input_th`).length;
            for (let th_length_i = 0; th_length_i < th_length; th_length_i++)
            {
                let tRowI = $(`#cal_table_${i+1} .cal_input_th`)[th_length_i];
                let tRow = $(tRowI).closest('tr').find('td');
                let PointValue = parseFloat($(tRowI).val());
                if(!PointValue)
                {
                    PointValue = 0;
                }

                if(parseInt($('#device_serial option:selected').val()) == 3 && i < 3)
                {
                    tableOBJ.pt_array.push(parseFloat(PointValue) / 1000);
                }
                else
                {
                    tableOBJ.pt_array.push(PointValue);
                }

                for(let j = 1; j < 9; j++)
                {
                    let cSelector = $(tRow)[j+1];
                    let cSelectorFind = $(cSelector).find('.cal_me');
                    let Value = $(cSelectorFind).val();
                    if(Value && !isNaN(Value))
                    {
                        if(parseInt($('#device_serial option:selected').val()) == 3 && i < 3)
                        {
                            tableOBJ[`bank${j}`].push(parseFloat(Value) / 1000);
                        }
                        else
                        {
                            tableOBJ[`bank${j}`].push(parseFloat(Value));
                        }
                    }
                    else
                    {
                        $(cSelectorFind).focus();
                        change_error_text('Please enter a correct value');
                        $("html,body").removeClass('wait');
                        $("#storeButton").prop('disabled',false);
                        return;
                    }
                }
            }

            if(tableOBJ.pt_array.length === 0)
            {
                change_error_text('Cal points empty');
                $("html,body").removeClass('wait');
                $("#storeButton").prop('disabled',false);
                return;
            }

            EmitEvents.to.emit(7, JSON.stringify(tableOBJ));
        }
    };

    returnObj.saveAoutCal = () => {
        let tablelength = $(".cal_table_").length;
        for(let i = 0; i < tablelength; i++)
        {
            let tableOBJ = {
                usbIndex: parseInt($('#device_serial option:selected').attr('data-usb')),
                device: parseInt($('#device_serial option:selected').attr('data-index')),
                type: parseInt($('#device_serial option:selected').val()),
                pt_array:[],
                channel1:[],
                channel2:[],
                channel3:[],
                bank: i
            };

            let th_length = $(`#cal_table_${i} .cal_input_th`).length;
            for (let th_length_i = 0; th_length_i < th_length; th_length_i++)
            {
                let tRowI = $(`#cal_table_${i} .cal_input_th`)[th_length_i];
                let tRow = $(tRowI).closest('tr').find('td');
                let PointValue = parseFloat($(tRowI).val());
                if(!PointValue)
                {
                    PointValue = 0;
                }

                //AOUT value is a 24bit int stored in 32bit value
                if(parseFloat($(tRowI).val()) > 5 || parseFloat($(tRowI).val()) < 0)
                {
                    change_error_text('Please enter a correct value for Cal point');
                    $("html,body").removeClass('wait');
                    $("#storeButton").prop('disabled',false);
                    return;
                }
                else
                {
                    PointValue = parseFloat($(tRowI).val());
                }
                tableOBJ.pt_array.push(PointValue);
                for(let j = 1; j < 4; j++)
                {
                    let cSelector = $(tRow)[j+1];
                    let cSelectorFind = $(cSelector).find('.cal_me');
                    let Value = $(cSelectorFind).val();
                    //diff for AOUT
                    if(Value && !isNaN(Value))
                    {
                        tableOBJ[`channel${j}`].push(parseFloat(Value));
                    }
                    else
                    {
                        $(cSelectorFind).focus();
                        change_error_text('Please enter a correct value');
                        $("html,body").removeClass('wait');
                        $("#storeButton").prop('disabled',false);
                        return;
                    }
                }
            }

            if(tableOBJ.pt_array.length === 0)
            {
                change_error_text('Cal points empty');
                $("html,body").removeClass('wait');
                $("#storeButton").prop('disabled',false);
                return;
            }

            EmitEvents.to.emit(7, JSON.stringify(tableOBJ));
        }
    };

    returnObj.interactiveCal = bank => {
        let tableOBJ = {
            usbIndex: parseInt($('#device_serial option:selected').attr('data-usb')),
            device: parseInt($('#device_serial option:selected').attr('data-index')),
            bank: bank,
            type: parseInt($('#device_serial option:selected').val())
        };

        if(parseInt($('#device_serial option:selected').val()) == 3)
        {
            tableOBJ.range = parseInt($('.cal_ain_range').find('.ain_select').val());
        }

        EmitEvents.to.emit(5, JSON.stringify(tableOBJ));
    };

    returnObj.manualCal = () => {
        EmitEvents.to.emit(0, 1);
    };

    returnObj.clearCal = () => {
        let tableOBJ = {
            usbIndex: parseInt($('#device_serial option:selected').attr('data-usb')),
            device: parseInt($('#device_serial option:selected').attr('data-index'))
        };

        EmitEvents.to.emit(8, JSON.stringify(tableOBJ));
    };

    returnObj.defaultSettings = (that) => {
        let deviceID = parseInt($(that).attr('data-number'));
        let usbIndex = parseInt($(that).attr('data-usb'));
        let tableOBJ = {
            usbIndex: usbIndex,
            device: deviceID - 1
        };

        EmitEvents.to.emit(13, JSON.stringify(tableOBJ));
    };

    return returnObj;
}

// initialize native object
let globalObj;

$('#device_connect').on('click',function(){
    $(this).prop('disabled',true);
    $('html,body').addClass('wait');
    globalObj = new NativeConstructor();
    globalObj.checkOnlineDevices();
});

$('#device_startlog').on('click',function(){
    $(this).prop('disabled',true);
    $('#device_stop').prop('disabled',false);
    globalObj.startDataPush();
});

$('#device_stop').on('click',function () {
    $(this).prop('disabled',true);
    if(globalObj.neoRADIO_status === 2)
    {
        globalObj.neoRADIO_status = 1;
        globalObj.pauseAll();
    }
});

$('#device_reload').on('click',() => {
    globalObj.close();
});

$('.ma_device').on('click','.device_group',function(){
    let deviceType = $(this).attr('data-type');
    let movePixel = $('.input_selector').width();
    let currentValue = $(this).find('.input_selector_value').val();
    if (currentValue == "0")
    {
        $(this).find('.input_selector').animate({left: (movePixel * 0.87)}, {
            duration: 50,
            complete: () => {
                $(this).prev().removeClass("offline");
                $(this).next().addClass("online");
                $(this).find('.input_selector_value').val("1");

                let selector = $(this).parents('.ma_device_wrap').find('.group_select');
                let selector2 = $(this).parents('.ma_device_wrap').find('.group_select_ain_radio');
                let selector3 = $(this).parents('.ma_device_wrap').find('.group_select_ain_select');

                $(selector).on('click change', function() {
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
                $(selector3).on('click change', function() {
                    $(selector3).val($(this).val());
                });

                if(deviceType == 4)
                {
                    let selector4a = $(this).parents('.ma_device_wrap').find('.device_check_status1');
                    let selector4b = $(this).parents('.ma_device_wrap').find('.device_check_status2');
                    let selector4c = $(this).parents('.ma_device_wrap').find('.device_check_status3');
                    $(selector4a).on('change', function() {
                        $(selector4a).prop('checked', $(this).prop('checked'));
                    });
                    $(selector4b).on('change', function() {
                        $(selector4b).prop('checked', $(this).prop('checked'));
                    });
                    $(selector4c).on('change', function() {
                        $(selector4c).prop('checked', $(this).prop('checked'));
                    });
                }
                else
                {
                    let selector4 = $(this).parents('.ma_device_wrap').find('.device_check_status');
                    $(selector4).on('change', function() {
                        $(selector4).prop('checked', $(this).prop('checked'));
                    });
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

                let selector = $(this).parents('.ma_device_wrap').find('.group_select');
                let selector2 = $(this).parents('.ma_device_wrap').find('.group_select_ain_radio');
                let selector3 = $(this).parents('.ma_device_wrap').find('.group_select_ain_select');
                let selector4 = $(this).parents('.ma_device_wrap').find('.device_check_status');
                $(selector).off();
                $(selector2).off();
                $(selector3).off();
                $(selector4).off();
            }
        });
    }
});

$('.ma_device').on('click','.can_fill_apply',function () {
    let that = $(this);
    let fill_type = $(this).parents('.ma_device_wrap').find('.can_fill_select').val();
    let Startid = parseInt($(this).parents('.ma_device_wrap').find('.can_fill_id').val(),16);
    let cantype_set = $(this).parents('.ma_device_wrap').find('.auto_fill_cantype').val();
    let cantypeid_set = $(this).parents('.ma_device_wrap').find('.auto_fill_canidtype').val();

    if(isNaN(Startid))
    {
        auto_fill_error_text('Please enter a correct Arb ID');
        return;
    }

    if(Startid > 0x3FFFFFFF)
    {
        auto_fill_error_text('Value too large');
        return;
    }

    if(Startid > 0x7FF && cantypeid_set == "3")
    {
        auto_fill_error_text('Value too large, try switching to extended');
        return;
    }

    dialog.showMessageBox({
        type:"warning",
        buttons:["OK","Cancel"],
        message:"Your current CAN settings will be lost, do you wish to continue?",
        cancelId: 0,
    },function (op) {
        if(!op)
        {
            $(that).parents('.ma_device_wrap').find('.ma_device_can_mode').val("0");
            $(that).parents('.ma_device_wrap').find('.ma_device_can_type').prop('disabled',false);
            $(that).parents('.ma_device_wrap').find('.ma_device_can_id_type').prop('disabled',false);
            $(that).parents('.ma_device_wrap').find('.ma_device_can_id').prop('disabled',false);
            $(that).parents('.ma_device_wrap').find('.ma_device_can_byte').prop('disabled',false);

            $(that).parents('.ma_device_wrap').find('.can_fill_id').val(Startid.toString(16));
            $(that).parents('.ma_device_wrap').find('.ma_device_can_type').val(cantype_set);
            $(that).parents('.ma_device_wrap').find('.ma_device_can_id_type').val(cantypeid_set);

            switch (fill_type) {
                case "1":
                    $(that).parents('.ma_device_wrap').find('.ma_device_can_id').each(function (index, element) {
                        $(element).val((index + Startid).toString(16));
                    });
                    $(that).parents('.ma_device_wrap').find('.ma_device_can_byte').each(function (index, element) {
                        $(element).val(0);
                    });
                    break;
                case "2":
                    $(that).parents('.ma_device_wrap').find('.ma_device_can_id').each(function (index, element) {
                        $(element).val((parseInt(index / 2) % 4 + Startid).toString(16));
                    });
                    $(that).parents('.ma_device_wrap').find('.ma_device_can_byte').each(function (index, element) {
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
                    $(that).parents('.ma_device_wrap').find('.ma_device_can_type').val("2");
                    $(that).parents('.ma_device_wrap').find('.ma_device_can_id').each(function (index, element) {
                        $(element).val(Startid.toString(16));
                    });
                    $(that).parents('.ma_device_wrap').find('.ma_device_can_byte').each(function (index, element) {
                        $(element).val(index * 4);
                    });
                    break;
            }
        }
    });
});

$('.ma_device').on('click','.set_export',function(){
    let that = $(this).parents('.ma_device_wrap');
    let type = parseInt($(that).attr('data-type'));
    let deviceID = parseInt($(that).attr('data-number'));
    let usbIndex = parseInt($(that).attr('data-usb'));
    let iloop = $(that).find('.table1 .ma_device_channel_head').length;
    let eachBankSettings = {};
    let exportJSON = {};

    let fileNameType = "";
    switch (type)
    {
        case 0:
            fileNameType = "TC";
            break;
        case 1:
            fileNameType = "DIO";
            break;
        case 2:
            fileNameType = "PWRRLY";
            break;
        case 3:
            fileNameType = "AIN";
            break;
        case 4:
            fileNameType = "AOUT";
            break;
        case 5:
            fileNameType = "CANHUB";
            break;
        case 6:
            fileNameType = "BADGE";
            break;
    }

    switch (type)
    {
        case 2:
            let CanMode = $(that).find(`.device_channel1 .ma_device_can_mode`).val();
            let CanMsgType = $(that).find(`.device_channel1 .ma_device_can_type`).val();
            let CanMsgTypeID = $(that).find(`.device_channel1 .ma_device_can_id_type`).val();
            let CanMsgToSend;
            if (!CanMsgType)
            {
                CanMsgType = 1;
            }
            if (CanMsgType == 1 && CanMsgTypeID == 3)
            {
                CanMsgToSend = 0;
            }
            if (CanMsgType == 1 && CanMsgTypeID == 4)
            {
                CanMsgToSend = 1;
            }
            if (CanMsgType == 2 && CanMsgTypeID == 3)
            {
                CanMsgToSend = 2;
            }
            if (CanMsgType == 2 && CanMsgTypeID == 4)
            {
                CanMsgToSend = 3;
            }
            let CanId = parseInt($(that).find(`.device_channel1 .ma_device_can_id`).val(),16);
            let CanLocation = parseInt($(that).find(`.device_channel1 .ma_device_can_byte`).val());

            if (CanMode == "1")
            {
                CanMsgToSend = 0xFF;
            }

            let tag_name = $(that).find(`.device_channel1 .ma_device_channel_tag`).val();
            let tag_json = [];
            let tag_name_length = tag_name.length;
            for (let j = 0; j < tag_name_length; j++)
            {
                tag_json[j] = tag_name.charCodeAt(j);
            }

            if(isNaN(CanId))
            {
                CanId = 0;
            }

            let ExtraArray = [];
            let bString = "";
            for (let i = 1; i <= iloop; i++)
            {
                let init_state = $(that).find(`.device_channel${i} .neorad_rly_input:checked`).val();
                bString += init_state;
            }
            ExtraArray[0] = bString.split("");
            ExtraArray[0] = ExtraArray[0].reverse();
            bString = ExtraArray[0].join("");
            ExtraArray[0] = parseInt(bString, 2);

            exportJSON = {
                usbIndex: parseInt(usbIndex),
                bank: 0,
                enables: 1,
                reportRate: 100,
                deviceType: 2,
                deviceLink: deviceID - 1,
                tagName: tag_json,
                CanId: CanId,
                CanMsgType: CanMsgToSend,
                CanLocation: CanLocation,
                extraSettings: ExtraArray,
                deviceTypeName: fileNameType
            };
            break;
        default:
            exportJSON = {
                usbIndex: parseInt(usbIndex),
                bank: [],
                deviceType: type,
                deviceLink: deviceID - 1,
                deviceTypeName: fileNameType
            };

            for (let i = 1; i <= iloop; i++)
            {
                let check_stat = $(that).find(`.device_channel${i} .ma_device_channel_status`).prev().prop('checked');
                let sample_stat = $(that).find(`.device_channel${i} .ma_device_channel_pullrate`).val();
                sample_stat = parseInt(sample_stat);

                let CanMode = $(that).find(`.device_channel${i} .ma_device_can_mode`).val();
                let CanMsgType = $(that).find(`.device_channel${i} .ma_device_can_type`).val();
                let CanMsgTypeID = $(that).find(`.device_channel${i} .ma_device_can_id_type`).val();
                let CanMsgToSend;
                if (!CanMsgType)
                {
                    CanMsgType = 1;
                }
                if (CanMsgType == 1 && CanMsgTypeID == 3)
                {
                    CanMsgToSend = 0;
                }
                if (CanMsgType == 1 && CanMsgTypeID == 4)
                {
                    CanMsgToSend = 1;
                }
                if (CanMsgType == 2 && CanMsgTypeID == 3)
                {
                    CanMsgToSend = 2;
                }
                if (CanMsgType == 2 && CanMsgTypeID == 4)
                {
                    CanMsgToSend = 3;
                }
                let CanId = parseInt($(that).find(`.device_channel${i} .ma_device_can_id`).val(),16);
                let CanLocation = parseInt($(that).find(`.device_channel${i} .ma_device_can_byte`).val());

                if (CanMode == "1")
                {
                    CanMsgToSend = 0xFF;
                }

                let tag_name = $(that).find(`.device_channel${i} .ma_device_channel_tag`).val();
                let tag_json = [];
                let tag_name_length = tag_name.length;
                for (let j = 0; j < tag_name_length; j++)
                {
                    tag_json[j] = tag_name.charCodeAt(j);
                }

                if (sample_stat < 5 || !sample_stat)
                {
                    sample_stat = 5;
                }

                if (sample_stat > 216000000)
                {
                    sample_stat = 216000000;
                }

                if(isNaN(CanId))
                {
                    CanId = 0;
                }

                let ExtraArray = [];

                switch (type)
                {
                    case 0:
                        if (check_stat)
                        {
                            check_stat = 1;
                        }
                        else
                        {
                            check_stat = 0;
                        }
                        break;
                    case 3:
                        if (check_stat)
                        {
                            let AIN_select = $(that).find(`.device_channel${i} .neorad_ain_sample_input:checked`).val();
                            if (AIN_select == "low")
                            {
                                check_stat = $(that).find(`.device_channel${i} .ain_low_select`).val();
                            }
                            else if (AIN_select == "high")
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
                        let check_stat1 = $(that).find(`.device_channel${i} .device_check_status1`).prop('checked');
                        let check_stat2 = $(that).find(`.device_channel${i} .device_check_status2`).prop('checked');
                        let check_stat3 = $(that).find(`.device_channel${i} .device_check_status3`).prop('checked');
                        ExtraArray = [check_stat1 ? 1 : 0, check_stat2 ? 1 : 0, check_stat3 ? 1 : 0];
                        break;
                    default:
                        break;
                }

                eachBankSettings = {
                    bank: i - 1,
                    enables: parseInt(check_stat),
                    reportRate: sample_stat,
                    tagName: tag_json,
                    CanId: CanId,
                    CanMsgType: CanMsgToSend,
                    CanLocation: CanLocation,
                    extraSettings: ExtraArray
                };

                exportJSON.bank.push(eachBankSettings);
            }
            break;
    }

    let myPath = path.join(mypath, `IntrepidCS\/neoRAD-IO2\/${fileNameType}.json`);

    $(this).blur();
    dialog.showSaveDialog({
        title:'Export DBC file',
        defaultPath: myPath,
        filters: [{
            name: 'JSON file',
            extensions: ['json']
        }]
    },(fileName) => {
        if (fileName === undefined || fileName == ""){
            dialog.showMessageBox({
                type:"warning",
                message:"You didn't export the file"
            });
            return;
        }
        fs.writeFile(fileName, JSON.stringify(exportJSON,null,2),(err) => {
            if (err) throw err;
        });
    });
});

$('.ma_device').on('click','.set_import',function(){
    let that = $(this).parents('.ma_device_wrap');
    let type = parseInt($(that).attr('data-type'));

    let fileNameType = "";
    switch (type)
    {
        case 0:
            fileNameType = "TC";
            break;
        case 1:
            fileNameType = "DIO";
            break;
        case 2:
            fileNameType = "PWRRLY";
            break;
        case 3:
            fileNameType = "AIN";
            break;
        case 4:
            fileNameType = "AOUT";
            break;
        case 5:
            fileNameType = "CANHUB";
            break;
        case 6:
            fileNameType = "BADGE";
            break;
    }
    let myPath = path.join(mypath, `IntrepidCS\/neoRAD-IO2\/${fileNameType}.json`);

    $(this).blur();
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

            if(dataObj["deviceType"] !== type)
            {
                dialog.showMessageBox({
                    type:"warning",
                    message:`You're trying to load a settings file for ${dataObj["deviceTypeName"]} to the current device ${fileNameType}.`
                });
                return;
            }

            let banklength = dataObj["bank"].length;
            for (let i = 1; i < banklength + 1; i++)
            {
                let EnableStatus = dataObj["bank"][i-1]['enables'];
                let ReportRate = dataObj["bank"][i-1]['reportRate'];
                let canArbid = dataObj["bank"][i-1]['CanId'];
                let canMsgType = dataObj["bank"][i-1]['CanMsgType'];
                let canLocation = dataObj["bank"][i-1]['CanLocation'];
                let canType, canIdType;

                switch (canMsgType)
                {
                    case 0:
                        canType = 1;
                        canIdType = 3;
                        $(that).find(`.device_channel${i} .ma_device_can_mode`).val("0");
                        $(that).find(`.device_channel${i} .ma_device_can_type`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_id_type`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_id`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_byte`).prop("disabled", false);
                        break;
                    case 1:
                        canType = 1;
                        canIdType = 4;
                        $(that).find(`.device_channel${i} .ma_device_can_mode`).val("0");
                        $(that).find(`.device_channel${i} .ma_device_can_type`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_id_type`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_id`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_byte`).prop("disabled", false);
                        break;
                    case 2:
                        canType = 2;
                        canIdType = 3;
                        $(that).find(`.device_channel${i} .ma_device_can_mode`).val("0");
                        $(that).find(`.device_channel${i} .ma_device_can_type`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_id_type`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_id`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_byte`).prop("disabled", false);
                        break;
                    case 3:
                        canType = 2;
                        canIdType = 4;
                        $(that).find(`.device_channel${i} .ma_device_can_mode`).val("0");
                        $(that).find(`.device_channel${i} .ma_device_can_type`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_id_type`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_id`).prop("disabled", false);
                        $(that).find(`.device_channel${i} .ma_device_can_byte`).prop("disabled", false);
                        break;
                    case 255:
                        $(that).find(`.device_channel${i} .ma_device_can_mode`).val("1");
                        $(that).find(`.device_channel${i} .ma_device_can_type`).prop("disabled", true);
                        $(that).find(`.device_channel${i} .ma_device_can_id_type`).prop("disabled", true);
                        $(that).find(`.device_channel${i} .ma_device_can_id`).prop("disabled", true);
                        $(that).find(`.device_channel${i} .ma_device_can_byte`).prop("disabled", true);
                        break;
                }

                $(that).find(`.device_channel${i} .ma_device_can_type`).val(canType);
                $(that).find(`.device_channel${i} .ma_device_can_id_type`).val(canIdType);
                $(that).find(`.device_channel${i} .ma_device_can_id`).val(canArbid.toString(16));
                $(that).find(`.device_channel${i} .ma_device_can_byte`).val(canLocation);

                let tagName = dataObj["bank"][i-1]['tagName'];
                let tagNameString = "";
                let tag_name_length = tagName.length;
                for (let k = 0; k < tag_name_length; k++)
                {
                    tagNameString += String.fromCharCode(tagName[k]);
                }

                if (EnableStatus > 0)
                {
                    $(that).find(`.device_channel${i} .ma_device_channel_status`).prev().prop('checked', true);
                }
                else
                {
                    $(that).find(`.device_channel${i} .ma_device_channel_status`).prev().prop('checked', false);
                }

                $(that).find(`.device_channel${i} .ma_device_channel_pullrate`).val(ReportRate);
                if (ReportRate == 10 ||
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
                    $(that).find(`.device_channel${i} .device_check_pullrate_select option[value="${ReportRate}"]`).prop('selected', true);
                }
                else
                {
                    $(that).find(`.device_channel${i} .device_check_pullrate_select option[value="0"]`).prop('selected', true);
                    $(that).find(`.device_channel${i} .ma_device_channel_pullrate`).prop('disabled', false);
                    $(that).find(`.device_channel${i} .ma_device_channel_pullrate`).parent().removeClass('opacity');
                }

                if (tagName && tagName != "")
                {
                    $(that).find(`.device_channel${i} .ma_device_channel_tag`).val(tagNameString);
                }

                switch (dataObj["deviceType"])
                {
                    case 2:
                        $(that).find(`.device_channel${i} .ma_device_wrap[data-type="2"] .device_default`).addClass('hidden').prop('disabled', true);

                        if(EnableStatus >= 0 && EnableStatus < 256)
                        {
                            let bStatus = parseInt(EnableStatus).toString(2);
                            let arrayholder = bStatus.split("");
                            arrayholder = arrayholder.reverse();
                            bStatus = arrayholder.join("");
                            for (let k = 0; k < 8; k++)
                            {
                                if (bStatus[k] == 1)
                                {
                                    $(that).find(`.device_channel${i} .device_channel${k + 1} #rly_on_${i}_${k + 1}`).prop('checked', true);
                                }
                                else
                                {
                                    $(that).find(`.device_channel${i} .device_channel${k + 1} #rly_off_${i}_${k + 1}`).prop('checked', true);
                                }
                            }
                        }
                        break;
                    case 3:
                        if (EnableStatus > 0 && EnableStatus < 4)
                        {
                            $(that).find(`.device_channel${i} .neorad_ain_sample_input[value="low"]`).prop("checked", true);
                            $(that).find(`.device_channel${i} .ain_low_select`).removeClass('hidden');
                            $(that).find(`.device_channel${i} .ain_high_select`).addClass('hidden');
                            $(that).find(`.device_channel${i} .ain_low_select option[value=${EnableStatus}]`).prop('selected', true);
                        }
                        else if (EnableStatus > 3 && EnableStatus < 7)
                        {
                            $(that).find(`.device_channel${i} .neorad_ain_sample_input[value="high"]`).prop("checked", true);
                            $(that).find(`.device_channel${i} .ain_low_select`).addClass('hidden');
                            $(that).find(`.device_channel${i} .ain_high_select`).removeClass('hidden');
                            $(that).find(`.device_channel${i} .ain_high_select option[value=${EnableStatus}]`).prop('selected', true);
                        }
                        break;
                    case 4:
                        let settings1_enable = dataObj["bank"][i-1]['extraSettings'][0];
                        let settings2_enable = dataObj["bank"][i-1]['extraSettings'][1];
                        let settings3_enable = dataObj["bank"][i-1]['extraSettings'][2];

                        if (settings1_enable > 0)
                        {
                            $(that).find(`.device_channel${i} .device_check_status1`).prop('checked', true);
                            $(that).find(`.device_channel${i} .neorad_aout_input_1`).prop('disabled', false);
                        }
                        else
                        {
                            $(that).find(`.device_channel${i} .device_check_status1`).prop('checked', false);
                            $(that).find(`.device_channel${i} .neorad_aout_input_1`).prop('disabled', true);
                        }

                        if (settings2_enable > 0)
                        {
                            $(that).find(`.device_channel${i} .device_check_status2`).prop('checked', true);
                            $(that).find(`.device_channel${i} .neorad_aout_input_2`).prop('disabled', false);
                        }
                        else
                        {
                            $(that).find(`.device_channel${i} .device_check_status2`).prop('checked', false);
                            $(that).find(`.device_channel${i} .neorad_aout_input_2`).prop('disabled', true);
                        }

                        if (settings3_enable > 0)
                        {
                            $(that).find(`.device_channel${i} .device_check_status3`).prop('checked', true);
                            $(that).find(`.device_channel${i} .neorad_aout_input_3`).prop('disabled', false);
                        }
                        else
                        {
                            $(that).find(`.device_channel${i} .device_check_status3`).prop('checked', false);
                            $(that).find(`.device_channel${i} .neorad_aout_input_3`).prop('disabled', true);
                        }
                        break;
                }
            }
        });
    });
});

$('.ma_device').on('click','.can_export',function(){
    let that = $(this).parents('.ma_device_wrap');
    let data_usb = $(that).attr('data-usb');
    let usb_chain = $(`.ma_device_wrap[data-usb=${data_usb}]`);
    let Obj = [];
    let ArbArray = [];
    let ByteArray = [];
    for(let i = 0; i < usb_chain.length; i++)
    {
        Obj.push(globalObj.getCanSettings(usb_chain[i]));
    }

    for(let i = 0; i < usb_chain.length; i++)
    {
        ArbArray.push(...Obj[i]["arb_array"]);
        ByteArray.push(...Obj[i]["byte_array"]);
    }

    for(let i = 0; i < ArbArray.length; i++)
    {
        for(let j = 0; j < ByteArray.length; j++)
        {
            if(ArbArray[i] == ArbArray[j] && i != j)
            {
                if(ByteArray[i] == ByteArray[j])
                {
                    change_error_text('Export Failed, CAN ID overlap');
                    return;
                }
            }
        }
    }

    let file_l = Obj.length;
    let file = "";
    for(let i = 0; i < file_l; i++)
    {
        if(i === 0)
        {
            file = Obj[i].deviceID;
        }
        else
        {
            file += `_${Obj[i].deviceID}`;
        }
    }

    let myPath = path.join(mypath, `IntrepidCS\/neoRAD-IO2\/${file}.dbc`);

    $(this).blur();
    dialog.showSaveDialog({
        title:'Export DBC file',
        defaultPath: myPath,
        filters: [{
            name: 'DBC file',
            extensions: ['dbc']
        }]
    },(fileName) => {
        if (fileName === undefined || fileName == ""){
            dialog.showMessageBox({
                type:"warning",
                message:"You didn't export the file"
            });
            return;
        }
        let json2dbc = require('../js/json2dbc');
        let sortObj = json2dbc.sortCanSettings(Obj);
        json2dbc.savedbc(sortObj,Obj,fileName);
    });
});

$('.ma_device').on('click','.device_save',function(){
    $('.device_save').tooltip('hide');
    $('.device_save').prop('disabled',true);
    $('.device_save_canhub').prop('disabled',true);
    $('.device_default').prop('disabled',true);
    $('#device_startlog').prop('disabled',true);
    $('html,body').addClass('wait');
    let that = $(this).parents('.ma_device_wrap');
    globalObj.gatherData(that);
});

$('.ma_device').on('click','.device_save_canhub',function(){
    $('.device_save').tooltip('hide');
    $('.device_save').prop('disabled',true);
    $('.device_save_canhub').prop('disabled',true);
    $('.device_default').prop('disabled',true);
    $('#device_startlog').prop('disabled',true);
    $('html,body').addClass('wait');
    let that = $(this).parents('.ma_device_wrap');
    globalObj.gatherData(that);
});

$('.ma_device').on('click','.device_default',function(){
    let that = $(this).parents('.ma_device_wrap');
    let selector = $(this);
    dialog.showMessageBox({
        type:"warning",
        buttons:["OK","Cancel"],
        message:"Your device settings will be reset! Current settings will be lost. Do you wish to continue?",
        cancelId: 0,
    },function (op) {
        if(!op)
        {
            $('html,body').addClass('wait');
            globalObj.defaultSettings(that);
        }
        else
        {
            $(selector).blur();
        }
    });
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

function saveCal() {
    $("#storeButton").prop('disabled',true);
    $('html,body').addClass('wait');
    if(globalObj == undefined || globalObj == "")
    {
        change_error_text("Connect to device first");
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

    if(parseInt($('#device_serial option:selected').val()) == 4)
    {
        globalObj.saveAoutCal();
    }
    else
    {
        globalObj.saveCal();
    }

}

function readnative(){
    if($('#device_serial option:selected').attr('data-index') == undefined)
    {
        change_error_text("No device available for calibration");
        $("#readButton").prop('disabled',false);
        return;
    }

    if(globalObj == undefined || globalObj == "")
    {
        change_error_text("Connect to device first");
        $("#readButton").prop('disabled',false);
        return;
    }

    $("#readButton").prop('disabled',true);
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

let PwrRelayTimer;
$('.ma_device').on('click','.input_selector_bg_pwrl',function () {
    clearTimeout(PwrRelayTimer);
    let movePixel = $('.input_selector').width();
    let currentValue = $(this).find('.input_selector_value').val();
    if (currentValue == "0")
    {
        $(this).find('.input_selector').animate({left: (movePixel * 0.87)}, {
            duration: 50,
            complete: () => {
                $(this).prev().removeClass("offline");
                $(this).next().addClass("online");
                $(this).find('.input_selector_value').val("1");

                let that = $(this).parents('.ma_device_wrap');
                if(globalObj.neoRADIO_status == 2)
                {
                    globalObj.SetPwrRly(that);
                    PwrRelayTimer = setTimeout(function () {
                        globalObj.startDataPush();
                    },100);
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
                if(globalObj.neoRADIO_status == 2)
                {
                    globalObj.SetPwrRly(that);
                    PwrRelayTimer = setTimeout(function () {
                        globalObj.startDataPush();
                    },100);
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
    let movePixel = $('.input_selector').width();
    let currentValue = $(this).find('.input_selector_value').val();
    if (currentValue == "0")
    {
        $(this).find('.input_selector').animate({left:(movePixel * 0.87)}, {
            duration: 50,
            complete: () => {
                $(this).prev().removeClass("offline");
                $(this).next().addClass("online");
                $(this).find('.input_selector_value').val("1");

                $('.cal_table_tc').on('focus','.cal_me',function () {
                    let calibration_bank = parseInt($(document.activeElement).attr('data-bank'));
                    $("#readButton").prop('disabled',true);
                    $("#exportButton").prop('disabled',true);
                    $("#importButton").prop('disabled',true);
                    $("#resetCalButton").prop('disabled',true);
                    $("#removeButton").prop('disabled',true);
                    globalObj.interactiveCal(calibration_bank);
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
                $("#exportButton").prop('disabled',false);
                $("#importButton").prop('disabled',false);
                $("#resetCalButton").prop('disabled',false);
                $("#removeButton").prop('disabled',false);
                $("#calibration_bank").text("");
                globalObj.manualCal();
            }
        });
    }
});

let AoutTimer;
$('.ma_device').on('blur','.neorad_aout_input',function () {
    clearTimeout(AoutTimer);
    let that = $(this).parents('.ma_device_wrap');
    let bank = $(this).parents('.em1').attr('data-bank');

    if($(this).val() < 0 || $(this).val() > 5)
    {
        $(this).val(0);
    }

    if(globalObj.neoRADIO_status == 2)
    {
        globalObj.SetAoutValue(that, bank);
        AoutTimer = setTimeout(function () {
            globalObj.startDataPush();
        },100);
    }
    else
    {
        globalObj.SetAoutValue(that, bank);
    }
});

$(".ma_device").on("focus",".neorad_aout_input", function () {
    $(this).select();
});

$('.ma_device').on('keyup','.neorad_aout_input',function (e) {
    if(e.which === 13)
    {
        let that = $(this).parents('.ma_device_wrap');
        let bank = $(this).parents('.em1').attr('data-bank');

        if($(this).val() < 0 || $(this).val() > 5)
        {
            $(this).val(0);
        }

        $(this).blur();
        if($(this).parents('.input-group').next().length === 0)
        {
            if($(this).parents('td').next().length === 0)
            {
                return;
            }
            $(this).parents('td').next().find('.neorad_aout_input')[0].focus();
        }
        else
        {
            $(this).parents('.input-group').next().children('.neorad_aout_input').focus();
        }
    }
});