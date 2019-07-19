const fs = require('fs');
const device_description =
{
    tc : "Thermalcouple",
    tc_min_max : "-200|1372",
    temp_unit : "c",
    ain : "AnalogIN",
    ain_min_max : "-50|50",
    power_unit : "V",
    aout : "AnalogOUT",
    aout_min_max : "-5|5",
    pwrrly : "PowerRelay",
    rly_min_max : "-5|5",
};

function save(mainFile, path){
    fs.writeFile(path, mainFile, (err) => {
        if (err) throw err;
    });
}

function sortCanSettings(obj) {
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
            sorted_array_dup_index[element] = [];
            if(sortArr.indexOf(element) === index)
            {
                sorted_array_index.push(sortArr.indexOf(element));
            }
        });

        sortArr.filter(function(element, index) {
            if(sortArr.indexOf(element) !== index)
            {
                sorted_array_dup_index[element].push(index);
            }
        });

        let SortedObj = {
            arbid_index:sorted_array_index,
            arbid_dup_index:sorted_array_dup_index
        };

        return SortedObj;
    }
    else
    {
        return 0;
    }
}

function generateTemplate(sortobj, obj){
    let description = "";
    let canFD_def1 = "";
    let canFD_def2 = "";
    let canFD_sg = "";
    let template = "";
    let arb_index_length = Object.keys(sortobj["arbid_dup_index"]).length;

    for(let i = 0; i < arb_index_length; i++)
    {
        let sg_index_length = Object.values(sortobj["arbid_dup_index"])[i].length;
        let bank_main = `Bank${Object.values(sortobj["arbid_index"])[i] + 1}`;
        let objdata = obj["data"][Object.values(sortobj["arbid_index"])[i]];
        let arbid = objdata["ArbId"];
        let byte_size = 4 * (sg_index_length + 1);
        let Bytestart = objdata["ByteStart"] * 8;

        let BA_ = `BA_ "VFrameFormat" BO_ ${arbid} 14; \r`;

        if(objdata["CanMsgStdXtd"] == 4)
        {
            arbid += 0x80000000;
            BA_ = `BA_ "VFrameFormat" BO_ ${arbid} 15; \r`;
        }

        if(objdata["CanMsgType"] == 2)
        {
            canFD_def1 = `\rBA_DEF_ BO_  "VFrameFormat" ENUM  "StandardCAN","ExtendedCAN","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","StandardCAN_FD","ExtendedCAN_FD";`;
            canFD_def2 = `\rBA_DEF_DEF_  "VFrameFormat" "StandardCAN";`;
            canFD_sg += BA_;
        }

        switch (obj.type) {
            case 0:
                description = device_description.tc;
                SG_ = ` SG_ ${bank_main} : ${Bytestart}|32@1+ (1,0) [${device_description.tc_min_max}] "${device_description.temp_unit}" Vector__XXX \r`;
                break;
            case 1:
                break;
            case 2:
                description = device_description.pwrrly;
                SG_ = ` SG_ ${bank_main} : ${Bytestart}|32@1+ (1,0) [${device_description.rly_min_max}] "${device_description.power_unit}" Vector__XXX \r`;
                break;
            case 3:
                description = device_description.ain;
                SG_ = ` SG_ ${bank_main} : ${Bytestart}|32@1+ (1,0) [${device_description.ain_min_max}] "${device_description.power_unit}" Vector__XXX \r`;
                break;
            case 4:
                description = device_description.aout;
                SG_ = ` SG_ ${bank_main} : ${Bytestart}|32@1+ (1,0) [${device_description.aout_min_max}] "${device_description.power_unit}" Vector__XXX \r`;
                break;
        }

        template += `BO_ ${arbid} ${description}: ${byte_size} Vector__XXX \r`;
        template += SG_;

        for(let j = 0; j < sg_index_length; j++)
        {
            let bank_sub = `Bank${Object.values(sortobj["arbid_dup_index"])[i][j] + 1}`;
            let bytestart = obj["data"][Object.values(sortobj["arbid_dup_index"])[i][j]]["ByteStart"] * 8;

            switch (obj.type) {
                case 0:
                    SG_ = ` SG_ ${bank_sub} : ${bytestart}|32@1+ (1,0) [${device_description.tc_min_max}] "${device_description.temp_unit}" Vector__XXX \r`;
                    break;
                case 1:
                    break;
                case 2:
                    break;
                case 3:
                    SG_ = ` SG_ ${bank_sub} : ${bytestart}|32@1+ (1,0) [${device_description.ain_min_max}] "${device_description.power_unit}" Vector__XXX \r`;
                    break;
                case 4:
                    SG_ = ` SG_ ${bank_sub} : ${bytestart}|32@1+ (1,0) [${device_description.aout_min_max}] "${device_description.power_unit}" Vector__XXX \r`;
                    break;
            }

            template += SG_;
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

${template}

BA_DEF_ SG_  "SignalType" STRING ;${canFD_def1}
BA_DEF_DEF_  "SignalType" "";${canFD_def2}
${canFD_sg}
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