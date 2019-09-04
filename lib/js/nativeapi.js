const neoRADIO2_RunStates = {
    'neoRADIO2state_Disconnected' : 0,
    'neoRADIO2state_ConnectedWaitForAppStart' : 1,
    'neoRADIO2state_ConnectedWaitIdentResponse' : 2,
    'neoRADIO2state_ConnectedWaitReadSettings' : 3,
    'neoRADIO2state_ConnectedWaitWriteSettings' : 4,
    'neoRADIO2state_Connected' : 5,
};
Object.freeze(neoRADIO2_RunStates);

const Addon = require("bindings")("neoRAD_IO2");
const EventEmitter = require('events');
if(typeof Addon == 'undefined')
{
    change_status_text("Missing SDK, Native module can't be loaded");
    return;
}

let emitter = new EventEmitter();
let worker = new Addon.DataWorker(
    (event, value) => {
        emitter.emit(event, value);
    }
);

let EmitEvents = {
    from:emitter,
    to:{
        emit: (name, data) => {
            worker.sendToAddon(name, data);
        }
    }
};

EmitEvents.from.on('error_msg', msg => {
    switch (msg) {
        case "100":
            worker.closeInput();
            change_status_text("Device failed to connect, please check physical connection");
            break;
        case "101":
            worker.closeInput();
            change_status_text("No devices found, please try again");
            break;
        case "102":
            change_status_text('Connection timed out. Please try reconnecting');
            break;
        case "200":
            change_status_text('Write settings failed');
            break;
        case "300":
            change_status_text('Store calibration data failed');
            $("#storeButton").prop('disabled',false);
            break;
    }
});

EmitEvents.from.on('killall', () => {
    console.log("connection terminated");
});

EmitEvents.from.on('paused', () => {
    console.log("paused");
});

EmitEvents.from.on('device_found', device_found => {
    if(JSON.parse(device_found) != "null")
    {

    }
});

EmitEvents.from.on('data_stream', data_stream => {
    processRawData(JSON.parse(data_stream));
});

EmitEvents.from.on('settings_reply_count', settings_reply_count => {
    change_status_text(`Saving in progress ${((parseInt(settings_reply_count) + 1) * 12.5).toFixed(0)}%`);
});

EmitEvents.from.on('settings_reply', settings_reply => {
    if(!settings_reply)
    {
        change_status_text('Reload Failed');
        return;
    }
});

EmitEvents.from.on('cal_read', data_stream => {
    data_stream = JSON.parse(data_stream);
});

EmitEvents.from.on('cal_settings', data_stream => {

});

EmitEvents.from.on('cal_inter', data_stream => {
    data_stream = JSON.parse(data_stream);
});

EmitEvents.from.on('cal_clear', data_stream => {

});

EmitEvents.from.on('default_loaded', data_stream => {

});

returnObj.close = () => {
    worker.closeInput();
    terminateAll();
};

returnObj.pauseData = () => {
    EmitEvents.to.emit(0, 0);
};

returnObj.checkOnlineDevices = () => {
    EmitEvents.to.emit(1, 1);
};

returnObj.startDataPush = () => {
    EmitEvents.to.emit(3, 3);
};

returnObj.SetPwrRly = function(that){
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

    if(type == "5")
    {
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
    }
    else
    {
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
            let CanId = $(that).find(`.device_channel${i} .ma_device_can_id`).val();
            let CanLocation = $(that).find(`.device_channel${i} .ma_device_can_byte`).val();

            if (CanMode == "1")
            {
                CanMsgToSend = 0xFF;
            }

            if (type == "2" && i !== 1)
            {
                CanId = 0;
                CanMsgToSend = 0xFF;
                CanLocation = 0;
            }

            let tag_name = $(that).find(`.device_channel${i} .ma_device_channel_tag`).val();
            let tag_json = [];
            let tag_name_length = tag_name.length;
            for (let j = 0; j < tag_name_length; j++)
            {
                tag_json[j] = tag_name.charCodeAt(j);
            }

            if (sample_stat < 10 || !sample_stat)
            {
                sample_stat = 10;
            }

            if (sample_stat > 600000)
            {
                sample_stat = 600000;
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
                case 2:
                    check_stat = 1;
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
                usbIndex: parseInt(usbIndex),
                bank: i - 1,
                enables: parseInt(check_stat),
                reportRate: sample_stat,
                deviceType: type,
                deviceLink: deviceID - 1,
                tagName: tag_json,
                CanId: parseInt(CanId),
                CanMsgType: parseInt(CanMsgToSend),
                CanLocation: parseInt(CanLocation),
                extraSettings: ExtraArray
            };

            EmitEvents.to.emit(4, JSON.stringify(eachBankSettings));
        }
    }
};

returnObj.getCanSettings = function(that){
    let type = parseInt($(that).attr('data-type'));
    let deviceID = $(that).find('.ma_device_serial_span').attr('data-serial');
    let iloop = $(that).find('.table1 .ma_device_channel_head').length;
    let can_settings = {
        "data":{}
    };
    can_settings['type'] = type;
    can_settings['deviceID'] = deviceID;

    for (let i = 1; i <= iloop; i++)
    {
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

        can_settings["data"][i-1] = {};
        can_settings["data"][i-1]['CanMode'] = parseInt(CanMode); // 0 Manual 1 Auto
        can_settings["data"][i-1]['CanMsgType'] = parseInt(CanMsgType); // 1 Classic 2 FD
        can_settings["data"][i-1]['CanMsgStdXtd'] = parseInt(CanMsgTypeID); // 3 Std 4 Xtd
        can_settings["data"][i-1]['ArbId'] = parseInt(CanId);
        can_settings["data"][i-1]['ByteStart'] = parseInt(CanLocation);

        if(type == 2)
        {
            break;
        }
    }

    return can_settings;
};

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

            tableOBJ.pt_array.push(PointValue);
            for(let j = 1; j < 9; j++)
            {
                let cSelector = $(tRow)[j+1];
                let cSelectorFind = $(cSelector).find('.cal_me');
                let Value = $(cSelectorFind).val();
                if(Value && !isNaN(Value))
                {
                    tableOBJ[`bank${j}`].push(parseFloat(Value));
                }
                else
                {
                    $(cSelectorFind).focus();
                    change_status_text('Please enter a correct value');
                    $("html,body").removeClass('wait');
                    $("#storeButton").prop('disabled',false);
                    return;
                }
            }
        }

        if(tableOBJ.pt_array.length === 0)
        {
            change_status_text('Points empty');
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
                change_status_text('Please enter a correct value for Cal point');
                $("html,body").removeClass('wait');
                $("#storeButton").prop('disabled',false);
                return;
            }
            else
            {
                PointValue = parseInt(parseFloat($(tRowI).val()) * 3355443);
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
                    tableOBJ[`channel${j}`].push(parseInt(parseFloat(Value) * 3355443));
                }
                else
                {
                    $(cSelectorFind).focus();
                    change_status_text('Please enter a correct value');
                    $("html,body").removeClass('wait');
                    $("#storeButton").prop('disabled',false);
                    return;
                }
            }
        }

        if(tableOBJ.pt_array.length === 0)
        {
            change_status_text('Points empty');
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

const neoradio2_obj = {
    finddevices: function () {

    },
    goonline:function () {

    },
    terminate:function () {

    },
    writesettings:function () {

    },
    readcalibrarion:function () {

    },
    writecalibration:function () {

    },
    clearcalibrarion:function () {

    }
};

module.exports = neoradio2_obj;