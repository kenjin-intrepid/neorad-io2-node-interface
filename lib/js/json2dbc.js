const fs = require('fs');
const device_description =
{
    tc : "Thermocouple",
    tc_min_max : "-200|1372",
    temp_unit : "c",
    ain : "AnalogIN",
    ain_min_max : "-45|45",
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
    if(Array.isArray(obj))
    {
        let array_length = obj.length;
        let sortArr = [];
        let sorted_array_index = [];
        let sorted_array_dup_index = {};
        for(let i = 0; i < obj.length; i++)
        {
            let length = Object.keys(obj[i]['data']).length;
            for(let j = 0; j < length; j++)
            {
                sortArr.push(parseInt(obj[i]['data'][j]['ArbId']));
            }
        }

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
}

function generateTemplate(sortobj, obj){
    let description = "";
    let description2 = "";
    let description3 = "";
    let canFD_def1 = "";
    let canFD_def2 = "";
    let canFD_sg = "";
    let template = "";
    let sigVal_temp = "";
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
                can_index = can_index - 8;
            }

            let objdata = obj[obj_index]["data"][can_index];
            let bank_main = "";
            let arbid = objdata["ArbId"];

            let indexOF = (Object.keys(sortobj["arbid_dup_index"])).indexOf(arbid.toString());
            let sg_index_length = Object.values(sortobj["arbid_dup_index"])[indexOF].length;

            let byte_size = 4 * (sg_index_length + 1);
            let Bytestart = objdata["ByteStart"] * 8;

            let BA_ = `BA_ "VFrameFormat" BO_ ${arbid} 14;\r`;
            let SG_;

            if(objdata["CanMsgStdXtd"] == 4)
            {
                arbid += 0x80000000;
                BA_ = `BA_ "VFrameFormat" BO_ ${arbid} 15;\r`;
            }

            if(objdata["CanMsgType"] == 2)
            {
                canFD_def1 = `\rBA_DEF_ BO_  "VFrameFormat" ENUM  "StandardCAN","ExtendedCAN","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","reserved","StandardCAN_FD","ExtendedCAN_FD";`;
                canFD_def2 = `\rBA_DEF_DEF_  "VFrameFormat" "StandardCAN";`;
                canFD_sg += BA_;
            }

            switch (obj[obj_index].type) {
                case 0:
                    description = device_description.tc;
                    description2 = device_description.tc_min_max;
                    description3 = device_description.temp_unit;
                    break;
                case 2:
                    description = device_description.pwrrly;
                    description2 = device_description.rly_min_max;
                    description3 = device_description.power_unit;
                    break;
                case 3:
                    description = device_description.ain;
                    description2 = device_description.ain_min_max;
                    description3 = device_description.power_unit;
                    break;
                case 4:
                    description = device_description.aout;
                    description2 = device_description.aout_min_max;
                    description3 = device_description.power_unit;
                    break;
            }

            objdata["Tagname"] ? bank_main = objdata["Tagname"] : bank_main = `${description}_Bank${Object.values(sortobj["arbid_index"])[i] + 1}`;
            SG_ = ` SG_ ${bank_main} : ${Bytestart}|32@1+ (1,0) [${description2}] "${description3}" Vector__XXX\r`;
            template += `BO_ ${arbid} ${description}_${obj[obj_index]['deviceID']}: ${byte_size} Vector__XXX\r`;
            template += SG_;

            let sig_val = `SIG_VALTYPE_ ${arbid} ${bank_main} : 1 ;\r`;
            sigVal_temp += sig_val;

            if(sg_index_length == 0)
            {
                template += "\r";
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
                        description = device_description.tc;
                        description2 = device_description.tc_min_max;
                        description3 = device_description.temp_unit;
                        break;
                    case 2:
                        description = device_description.pwrrly;
                        description2 = device_description.rly_min_max;
                        description3 = device_description.power_unit;
                        break;
                    case 3:
                        description = device_description.ain;
                        description2 = device_description.ain_min_max;
                        description3 = device_description.power_unit;
                        break;
                    case 4:
                        description = device_description.aout;
                        description2 = device_description.aout_min_max;
                        description3 = device_description.power_unit;
                        break;
                }

                sub_objdata["Tagname"] ? bank_sub = sub_objdata["Tagname"] : bank_sub = `${description}_Bank${sub_can_index + 1}`;
                SG_ = ` SG_ ${bank_sub} : ${bytestart}|32@1+ (1,0) [${description2}] "${description3}" Vector__XXX\r`;
                template += SG_;

                sig_val = `SIG_VALTYPE_ ${arbid} ${bank_sub} : 1 ;\r`;
                sigVal_temp += sig_val;

                if((j + 1) == sg_index_length)
                {
                    template += "\r";
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


${template}

BA_DEF_ SG_  "SignalType" STRING ;${canFD_def1}
BA_DEF_DEF_  "SignalType" "";${canFD_def2}
${canFD_sg}

${sigVal_temp}
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