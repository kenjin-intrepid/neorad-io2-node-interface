const fs = require('fs');
const device_description =
{
    temp_unit : "C",
    power_unit : "V",
    tc : "Thermocouple",
    tc_min_max : "-200|1372",
    ain : "AnalogIN",
    ain_min_max : "-45|45",
    aout : "AnalogOUT",
    aout_min_max : "0|65535",
    pwrrly : "PowerRelay",
    rly_min_max : "-5|5",
    sig_type_uint : "0",
    sig_type_float32 : "1",
    sig_bit_len16 : "16",
    sig_bit_len32 : "32"
};

const dio_val_table =
`VAL_TABLE_ ChannelOutput 0 "Channel 1" 1 "Channel 2" ;
VAL_TABLE_ Output_Config 0 "Disable" 1 "Digital" 2 "PWM" 3 "Oneshot Pulse" ;
VAL_TABLE_ Output_State 0 "HighZ" 1 "Low Reverse" 2 "High Forward" 3 "Break" ;
VAL_TABLE_ Invert 0 "Idle Low" 1 "Idle High" ;
VAL_TABLE_ Hbrigde 0 "Outputs independent" 1 "Outputs Linked" ;
VAL_TABLE_ ChannelInput 0 "Channel 1" 1 "Channel 2" 2 "Channel 3" ;
VAL_TABLE_ Input_Mode 0 "Disable" 1 "Digital" 2 "PWM" 3 "Period" 4 "Frequency" 5 "Analog" ;
`

function save(mainFile, path){
    fs.writeFile(path, mainFile, (err) => {
        if (err) throw err;
    });
}

function sortCanSettings(obj) {
    if(Array.isArray(obj))
    {
        let array_length = obj.length;
        let sortArr = [];
        let sorted_array_index = [];
        let sorted_array_dup_index = {};
        for(let i = 0; i < array_length; i++)
        {
            let length = Object.keys(obj[i]['data']).length;
            for(let j = 0; j < length; j++)
            {
                sortArr.push(parseInt(obj[i]['data'][j]['ArbId']));
            }
        }

        sortArr.filter(function(element, index) {
            if(!isNaN(element))
            {
                sorted_array_dup_index[element] = [];
                if(sortArr.indexOf(element) === index)
                {
                    sorted_array_index.push(sortArr.indexOf(element));
                }
            }
        });

        sortArr.filter(function(element, index) {
            if(!isNaN(element))
            {
                if(sortArr.indexOf(element) !== index)
                {
                    sorted_array_dup_index[element].push(index);
                }
            }
        });

        return {
            arbid_index:sorted_array_index,
            arbid_dup_index:sorted_array_dup_index
        };
    }
    else
    {
        if(obj.deviceID)
        {
            let sortArr = [];
            let length = Object.keys(obj['data']).length;
            for(let i = 0; i < length; i++)
            {
                sortArr.push(parseInt(obj['data'][i]['ArbId']));
            }

            let sorted_array_index = [];
            let sorted_array_dup_index = {};
            sortArr.filter(function(element, index) {
                if(!isNaN(element))
                {
                    sorted_array_dup_index[element] = [];
                    if(sortArr.indexOf(element) === index)
                    {
                        sorted_array_index.push(sortArr.indexOf(element));
                    }
                }
            });

            sortArr.filter(function(element, index) {
                if(!isNaN(element))
                {
                    if(sortArr.indexOf(element) !== index)
                    {
                        sorted_array_dup_index[element].push(index);
                    }
                }
            });

            return {
                arbid_index:sorted_array_index,
                arbid_dup_index:sorted_array_dup_index
            };
        }
        else
        {
            return 0;
        }
    }
}

function generateTemplate(sortobj, obj){
    let canFD_def1 = "";
    let canFD_def2 = "";
    let canFD_sg = "";
    let template = "";
    let sigVal_temp = "";
    let val_table = "";
    let dio_sig_temp = "";
    let dio_val_temp = "";
    let arb_index_length = Object.keys(sortobj["arbid_dup_index"]).length;

    if(Array.isArray(obj))
    {
        for(let i = 0; i < arb_index_length; i++)
        {
            let can_index = Object.values(sortobj["arbid_index"])[i];
            let obj_index = 0;
            while(can_index > 7)
            {
                obj_index++;
                can_index -= 8;
            }

            let objdata = obj[obj_index]["data"][can_index];
            let bank_main = "";
            let bank_main_value = "";
            let arbid = objdata["ArbId"];

            let indexOF = (Object.keys(sortobj["arbid_dup_index"])).indexOf(arbid.toString());
            let sg_index_length = Object.values(sortobj["arbid_dup_index"])[indexOF].length;

            let byte_size = 4 * (sg_index_length + 1);
            let Bytestart = objdata["ByteStart"] * 8;

            let BA_ = `BA_ "VFrameFormat" BO_ ${arbid} 14;\n`;
            let SG_;
            let sig_val = "";

            if(objdata["CanMsgStdXtd"] == 4)
            {
                arbid += 0x80000000;
                BA_ = `BA_ "VFrameFormat" BO_ ${arbid} 15;\n`;
            }

            if(objdata["CanMsgType"] == 2)
            {
                canFD_def1 = `\nBA_DEF_ BO_  "VFrameFormat" ENUM  "StandardCAN","ExtendedCAN","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","StandardCAN_FD","ExtendedCAN_FD";`;
                canFD_def2 = `\nBA_DEF_DEF_  "VFrameFormat" "StandardCAN";`;
                canFD_sg += BA_;
            }

            //fixes dbc bank number not showing correctly
            bank_main_value = Object.values(sortobj["arbid_index"])[i] + 1;
            while (bank_main_value > 8)
            {
                bank_main_value -= 8;
            }

            switch (obj[obj_index].type) {
                case 0:
                    objdata["Tagname"] ? bank_main = objdata["Tagname"] : bank_main = `${device_description.tc}_Bank${bank_main_value}`;
                    SG_ = ` SG_ ${bank_main} : ${Bytestart}|32@1+ (1,0) [${device_description.tc_min_max}] "${device_description.temp_unit}" Vector__XXX\n`;
                    template += `BO_ ${arbid} ${device_description.tc}_${obj[obj_index]['deviceID']}: ${byte_size} Vector__XXX\n`;
                    template += SG_;

                    sig_val = `\nSIG_VALTYPE_ ${arbid} ${bank_main} : 1 ;`;
                    break;
                case 1:
                    val_table = dio_val_table;
                    objdata["Tagname"] ? bank_main = objdata["Tagname"] : bank_main = `${objdata["bankType"]}`;
                    if(objdata["bankType"] == "DigitalOUT")
                    {
                        template += `BO_ ${arbid} ${obj[obj_index]['deviceID']}_DigitalOUT: ${byte_size} Vector__XXX\n`;
                        template += ` SG_ ChannelOutput : ${Bytestart}|1@0+ (1,0) [0|1] "" Vector__XXX\n`;
                        template += ` SG_ Output_Config : ${Bytestart + 3}|3@0+ (1,0) [0|3] "" Vector__XXX\n`;
                        template += ` SG_ Output_State : ${Bytestart + 5}|2@0+ (1,0) [0|3] "" Vector__XXX\n`;
                        template += ` SG_ Invert : ${Bytestart + 6}|1@0+ (1,0) [0|1] "" Vector__XXX\n`;
                        template += ` SG_ Hbrigde : ${Bytestart + 7}|1@0+ (1,0) [0|1] "" Vector__XXX\n`;

                        dio_sig_temp += `\nBA_ "SignalType" SG_ ${arbid} ChannelOutput "ENM";`;
                        dio_sig_temp += `\nBA_ "SignalType" SG_ ${arbid} Output_Config "ENM";`;
                        dio_sig_temp += `\nBA_ "SignalType" SG_ ${arbid} Output_State "ENM";`;
                        dio_sig_temp += `\nBA_ "SignalType" SG_ ${arbid} Invert "ENM";`;
                        dio_sig_temp += `\nBA_ "SignalType" SG_ ${arbid} Hbrigde "ENM";`;

                        dio_val_temp += `\nVAL_ ${arbid} ChannelOutput 0 "Channel 1" 1 "Channel 2" ;`;
                        dio_val_temp += `\nVAL_ ${arbid} Output_Config 0 "Disable" 1 "Digital" 2 "PWM" 3 "Oneshot Pulse" ;`;
                        dio_val_temp += `\nVAL_ ${arbid} Output_State 0 "HighZ" 1 "Low Reverse" 2 "High Forward" 3 "Break" ;`;
                        dio_val_temp += `\nVAL_ ${arbid} Invert 0 "Idle Low" 1 "Idle High" ;`;
                        dio_val_temp += `\nVAL_ ${arbid} Hbrigde 0 "Outputs independent" 1 "Outputs Linked" ;`;
                    }
                    else
                    {
                        template += `BO_ ${arbid} ${obj[obj_index]['deviceID']}_DigitalIN: ${byte_size} Vector__XXX\n`;
                        template += ` SG_ ChannelInput : ${Bytestart}|1@0+ (1,0) [0|1] "" Vector__XXX\n`;
                        template += ` SG_ Input_Mode : ${Bytestart + 3}|3@0+ (1,0) [0|5] "" Vector__XXX\n`;

                        dio_sig_temp += `\nBA_ "SignalType" SG_ ${arbid} ChannelInput "ENM";`;
                        dio_sig_temp += `\nBA_ "SignalType" SG_ ${arbid} Input_Mode "ENM";`;

                        dio_val_temp += `\nVAL_ ${arbid} ChannelInput 0 "Channel 1" 1 "Channel 2" 2 "Channel3";`;
                        dio_val_temp += `\nVAL_ ${arbid} Input_Mode 0 "Disable" 1 "Digital" 2 "PWM" 3 "Period" 4 "Frequency" 5 "Analog";`;
                    }
                    break;
                case 2:
                    objdata["Tagname"] ? bank_main = objdata["Tagname"] : bank_main = `${device_description.pwrrly}`;
                    template += `BO_ ${arbid} ${device_description.pwrrly}_${obj[obj_index]['deviceID']}: ${byte_size} Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Mask1 : ${(objdata["ByteStart"] * 8) + 0}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Mask2 : ${(objdata["ByteStart"] * 8) + 1}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Mask3 : ${(objdata["ByteStart"] * 8) + 2}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Mask4 : ${(objdata["ByteStart"] * 8) + 3}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Mask5 : ${(objdata["ByteStart"] * 8) + 4}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Mask6 : ${(objdata["ByteStart"] * 8) + 5}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Mask7 : ${(objdata["ByteStart"] * 8) + 6}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Mask8 : ${(objdata["ByteStart"] * 8) + 7}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Relay1 : ${(objdata["ByteStart"] * 8) + 8}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Relay2 : ${(objdata["ByteStart"] * 8) + 9}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Relay3 : ${(objdata["ByteStart"] * 8) + 10}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Relay4 : ${(objdata["ByteStart"] * 8) + 11}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Relay5 : ${(objdata["ByteStart"] * 8) + 12}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Relay6 : ${(objdata["ByteStart"] * 8) + 13}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Relay7 : ${(objdata["ByteStart"] * 8) + 14}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_Relay8 : ${(objdata["ByteStart"] * 8) + 15}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;

                    sig_val = `\nSIG_VALTYPE_ ${arbid} ${bank_main} : 1 ;`;
                    break;
                case 3:
                    objdata["Tagname"] ? bank_main = objdata["Tagname"] : bank_main = `${device_description.ain}_Bank${bank_main_value}`;
                    SG_ = ` SG_ ${bank_main} : ${Bytestart}|32@1+ (1,0) [${device_description.ain_min_max}] "${device_description.power_unit}" Vector__XXX\n`;
                    template += `BO_ ${arbid} ${device_description.ain}_${obj[obj_index]['deviceID']}: ${byte_size} Vector__XXX\n`;
                    template += SG_;

                    sig_val = `\nSIG_VALTYPE_ ${arbid} ${bank_main} : 1 ;`;
                    break;
                case 4:
                    objdata["Tagname"] ? bank_main = objdata["Tagname"] : bank_main = `${device_description.aout}_Bank${bank_main_value}`;
                    template += `BO_ ${arbid} ${device_description.aout}_${obj[obj_index]['deviceID']}: ${byte_size} Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_CH1 : ${(objdata["ByteStart"] * 8) + 0}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_CH2 : ${(objdata["ByteStart"] * 8) + 1}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_CH3 : ${(objdata["ByteStart"] * 8) + 2}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_CH1_OUT : ${(objdata["ByteStart"] * 8) + 8}|16@1+ (1,0) [${device_description.aout_min_max}] "${device_description.power_unit}" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_CH2_OUT : ${(objdata["ByteStart"] * 8) + 24}|16@1+ (1,0) [${device_description.aout_min_max}] "${device_description.power_unit}" Vector__XXX\n`;
                    template += ` SG_ ${bank_main}_CH3_OUT : ${(objdata["ByteStart"] * 8) + 40}|16@1+ (1,0) [${device_description.aout_min_max}] "${device_description.power_unit}" Vector__XXX\n`;

                    sig_val = `\nSIG_VALTYPE_ ${arbid} ${bank_main} : 1 ;`;
                    break;
            }

            sigVal_temp += sig_val;

            if(sg_index_length == 0)
            {
                template += "\n";
            }

            for(let j = 0; j < sg_index_length; j++)
            {
                let sub_can_index = Object.values(sortobj["arbid_dup_index"])[indexOF][j];
                let sub_obj_index = 0;
                while(sub_can_index > 7)
                {
                    sub_obj_index++;
                    sub_can_index = sub_can_index - 8;
                }
                let sub_objdata = obj[sub_obj_index]["data"][sub_can_index];
                let bank_sub = "";
                let bytestart = sub_objdata["ByteStart"] * 8;

                switch (obj[sub_obj_index].type) {
                    case 0:
                        sub_objdata["Tagname"] ? bank_sub = sub_objdata["Tagname"] : bank_sub = `${device_description.tc}_Bank${sub_can_index + 1}`;
                        SG_ = ` SG_ ${bank_sub} : ${bytestart}|32@1+ (1,0) [${device_description.tc_min_max}] "${device_description.temp_unit}" Vector__XXX\n`;
                        template += SG_;

                        sig_val = `\nSIG_VALTYPE_ ${arbid} ${bank_sub} : 1 ;`;
                        break;
                    case 1:
                        sub_objdata["Tagname"] ? bank_main = sub_objdata["Tagname"] : bank_main = `${sub_objdata["bankType"]}`;
                        if(sub_objdata["bankType"] == "DigitalOUT")
                        {
                            template += ` SG_ ChannelOutput : ${bytestart}|1@0+ (1,0) [0|1] "" Vector__XXX\n`;
                            template += ` SG_ Output_Config : ${bytestart + 3}|3@0+ (1,0) [0|3] "" Vector__XXX\n`;
                            template += ` SG_ Output_State : ${bytestart + 5}|2@0+ (1,0) [0|3] "" Vector__XXX\n`;
                            template += ` SG_ Invert : ${bytestart + 6}|1@0+ (1,0) [0|1] "" Vector__XXX\n`;
                            template += ` SG_ Hbrigde : ${bytestart + 7}|1@0+ (1,0) [0|1] "" Vector__XXX\n`;
                        }
                        else
                        {
                            template += ` SG_ ChannelInput : ${bytestart}|1@0+ (1,0) [0|1] "" Vector__XXX\n`;
                            template += ` SG_ Input_Mode : ${bytestart + 3}|3@0+ (1,0) [0|5] "" Vector__XXX\n`;
                        }
                        break;
                    case 2:
                        sub_objdata["Tagname"] ? bank_sub = sub_objdata["Tagname"] : bank_sub = `${device_description.pwrrly}_Bank${sub_can_index + 1}`;
                        SG_ = ` SG_ ${bank_sub} : ${bytestart}|32@1+ (1,0) [${device_description.rly_min_max}] "${device_description.power_unit}" Vector__XXX\n`;
                        template += SG_;

                        sig_val = `\nSIG_VALTYPE_ ${arbid} ${bank_sub} : 1 ;`;
                        break;
                    case 3:
                        sub_objdata["Tagname"] ? bank_sub = sub_objdata["Tagname"] : bank_sub = `${device_description.ain}_Bank${sub_can_index + 1}`;
                        SG_ = ` SG_ ${bank_sub} : ${bytestart}|32@1+ (1,0) [${device_description.ain_min_max}] "${device_description.power_unit}" Vector__XXX\n`;
                        template += SG_;

                        sig_val = `\nSIG_VALTYPE_ ${arbid} ${bank_sub} : 1 ;`;
                        break;
                    case 4:
                        sub_objdata["Tagname"] ? bank_sub = sub_objdata["Tagname"] : bank_sub = `${device_description.aout}_Bank${sub_can_index + 1}`;
                        template += ` SG_ ${bank_sub}_CH1 : ${(sub_objdata["ByteStart"] * 8) + 0}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                        template += ` SG_ ${bank_sub}_CH2 : ${(sub_objdata["ByteStart"] * 8) + 1}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                        template += ` SG_ ${bank_sub}_CH3 : ${(sub_objdata["ByteStart"] * 8) + 2}|1@1+ (1,0) [0|0] "" Vector__XXX\n`;
                        template += ` SG_ ${bank_sub}_CH1_OUT : ${(sub_objdata["ByteStart"] * 8) + 8}|16@1+ (1,0) [${device_description.aout_min_max}] "${device_description.power_unit}" Vector__XXX\n`;
                        template += ` SG_ ${bank_sub}_CH2_OUT : ${(sub_objdata["ByteStart"] * 8) + 24}|16@1+ (1,0) [${device_description.aout_min_max}] "${device_description.power_unit}" Vector__XXX\n`;
                        template += ` SG_ ${bank_sub}_CH3_OUT : ${(sub_objdata["ByteStart"] * 8) + 40}|16@1+ (1,0) [${device_description.aout_min_max}] "${device_description.power_unit}" Vector__XXX\n`;

                        sig_val = `\nSIG_VALTYPE_ ${arbid} ${bank_sub} : 1 ;`;
                        break;
                }

                sigVal_temp += sig_val;

                if((j + 1) == sg_index_length)
                {
                    template += "\n";
                }
            }
        }
    }

    return `VERSION ""

NS_ :
    NS_DESC_
    CM_
    BA_DEF_
    BA_
    VAL_
    CAT_DEF_
    CAT_
    FILTER
    BA_DEF_DEF_
    EV_DATA_
    ENVVAR_DATA_
    SGTYPE_
    SGTYPE_VAL_
    BA_DEF_SGTYPE_
    BA_SGTYPE_
    SIG_TYPE_REF_
    VAL_TABLE_
    SIG_GROUP_
    SIG_VALTYPE_
    SIGTYPE_VALTYPE_
    BO_TX_BU_
    BA_DEF_REL_
    BA_REL_
    BA_DEF_DEF_REL_
    BU_SG_REL_
    BU_EV_REL_
    BU_BO_REL_

BS_:

BU_:
${val_table}

${template}

BA_DEF_ SG_  "SignalType" STRING ;${canFD_def1}
BA_DEF_DEF_  "SignalType" "";${canFD_def2}
${canFD_sg}
${sigVal_temp}${dio_sig_temp}${dio_val_temp}
`;
}

let json2dbc = {
    savedbc: function(sortobj, obj, path){
        if(obj)
        {
            save(generateTemplate(sortobj,obj), path);
        }
        else
        {
            return;
        }
    },
    sortCanSettings: function (obj) {
        return sortCanSettings(obj);
    }
};

module.exports = json2dbc;