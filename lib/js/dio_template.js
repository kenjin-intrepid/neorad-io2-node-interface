let dio_template = {};

dio_template.generate_template = function(obj,index){
    function din_channel_template(i,number)
    {
        return `
            <div class="form-group">
                <label for="dio_mode_select_${number}_${index}_${i}">CH${number} Mode:</label>
                <select class="form-control form-control-sm dio_mode_select dio_mode_select_${number}" id="dio_mode_select_${number}_${index}_${i}" data-bank="${i}" data-channel="${number}">
                    <option value="0">Disabled</option>
                    <option value="1">Digital Input</option>
                    <option value="2">PWM input</option>
                    <option value="3">Period</option>
                    <option value="4">Frequency</option>
                    <option value="5">Analog</option>
                </select>
            </div>
            <hr>
        `
    }

    function din_template(i) {
        return `
            <td class="device_channel${i} em1" data-device="ma_device_c${i}">
                <div class="form-group neorad_tag">
                    <label for="device_check_tag${index}_${i}">${def_lang.text_tagname}:</label>
                    <input class="form-control form-control-sm ma_device_channel_tag" id="device_check_tag${index}_${i}" maxlength="14" pattern="[a-zA-Z0-9]" data-checkbox="device${index+1}_ch${i}" tabindex="${index * 8 + i}">
                </div>
                <div class="form-group neorad_sample">
                    <label for="device_check_pullrate${index}_${i}">${def_lang.text_sample}:</label>
                    <select class="form-control form-control-sm group_select device_check_pullrate_select" id="device_check_pullrate${index}_${i}">
                        <option value="10">10 ms</option>
                        <option value="20">20 ms</option>
                        <option value="50">50 ms</option>
                        <option value="100">100 ms</option>
                        <option value="200">200 ms</option>
                        <option value="500">500 ms</option>
                        <option value="1000">1000 ms</option>
                        <option value="2000">2000 ms</option>
                        <option value="5000">5000 ms</option>
                        <option value="0">${def_lang.text_custom}</option>
                    </select>
                    <div class="input-group input-group-sm mb-3 opacity">
                        <input type="number" class="form-control form-control-sm group_select ma_device_channel_pullrate" value="1000" disabled>
                        <div class="input-group-prepend">
                            <label class="input-group-text form-control-sm">ms</label>
                        </div>
                    </div>
                </div> 
                <div class="form-group neorad_vol_trigger">
                    <div class="form-group">
                        <label for="dio_v_trig_${index}_${i}">Voltage trigger:</label>
                        <div class="input-group input-group-sm mb-3 opacity">
                            <input type="number" class="form-control form-control-sm dio_v_trig" id="dio_v_trig${index}_${i}">
                            <div class="input-group-prepend">
                                <label class="input-group-text form-control-sm">V</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="form-group neorad_din_prescaler">
                    <label for="dio_prescaler_${index}_${i}">Clock prescaler:</label>
                    <div class="input-group input-group-sm mb-3 opacity">
                        <input type="number" class="form-control form-control-sm dio_prescaler" id="dio_prescaler_${index}_${i}">
                    </div>
                </div>
            </td>
        `;
    }

    function dout_template(i) {
        return `
            <td class="device_channel${i} dout_channels em1" data-device="ma_device_c${i}">
                <div class="form-group neorad_tag">
                    <label for="device_check_tag${index}_${i}">${def_lang.text_tagname}:</label>
                    <input class="form-control form-control-sm ma_device_channel_tag" id="device_check_tag${index}_${i}" maxlength="14" pattern="[a-zA-Z0-9]" data-checkbox="device${index+1}_ch${i}" tabindex="${index * 8 + i}">
                </div>
                <div class="form-group neorad_dout_prescaler">
                    <label for="dout_prescaler_${index}_${i}">Clock prescaler:</label>
                    <div class="input-group input-group-sm mb-3 opacity">
                        <input type="number" class="form-control form-control-sm dout_prescaler" id="dout_prescaler_${index}_${i}">
                    </div>
                </div>
            </td>
        `;
    }

    function can_template(i) {
        return `
            <td class="device_channel${i} em1" data-device="ma_device_c${i}">
                <div class="form-group neorad_can_set">
                    <label>${def_lang.can_type}:</label>
                    <select class="form-control form-control-sm device_check_status ma_device_can_type">
                        <option value="1">${def_lang.can_type_classic}</option>
                        <option value="2">CAN FD</option>
                    </select>
                    <select class="form-control form-control-sm device_check_status ma_device_can_id_type">
                        <option value="3">Standard 11Bit</option>
                        <option value="4" selected>Extended 29Bit</option>
                    </select>
                </div>
                <div class="form-group neorad_can_id">
                    <label>CAN ID: (Hex)</label>
                    <input class="form-control form-control-sm device_check_status ma_device_can_id" pattern="[a-fA-F0-9]" placeholder="Hex Value">
                    <div class="can_id_alert"></div>
                </div>
                <div class="form-group neorad_can_msg">
                    <label>${def_lang.can_byte}:</label>
                    <input class="form-control form-control-sm device_check_status ma_device_can_byte" pattern="[a-fA-F0-9]" placeholder="${def_lang.can_byte}">
                    <div class="byte_id_alert"></div>
                </div>
            </td>
        `;
    }

    function _table_head(){
        let th_temp = "";
        for (let i = 1; i < 9; i++)
        {
            if(i < 5)
            {
                th_temp += `
                <th class="ma_device_channel_head em15" data-deviceHead="ma_device_c${i}">
                    <i class="fas fa-wave-square"></i>
                    DIN${i}
                </th>
                `
            }
            else
            {
                th_temp += `
                <th class="ma_device_channel_head em15" data-deviceHead="ma_device_c${i}">
                    <i class="fas fa-wave-square"></i>
                    DOUT${i}
                </th>
                `
            }
        }

        return `
        <thead class="thead-dark">
        <tr>
            ${th_temp}
        </tr>
        </thead>
        `;
    }

    let template_td = "";
    let can_td = "";
    let temp_template = "";
    let table_head = _table_head();

    for (let i = 1; i < 9; i++)
    {
        can_td += can_template(i);
        if(i < 5)
        {
            let din_channel_template_holder = "";

            for(let j = 1; j < 4; j++)
            {
                din_channel_template_holder += din_channel_template(i, j);
            }

            template_td += din_template(i);
            temp_template += `
                <td class="device_channel${i} em1" data-device="ma_device_c${i}" data-bank="${i}">
                    ${din_channel_template_holder}
                    <label>Channel 1</label>
                    <div class="input-group input-group-sm mb-3 opacity">
                        <input class="form-control form-control-sm din_ch1_value" placeholder="Ch 1" disabled>
                        <div class="input-group-prepend">
                            <label class="input-group-text form-control-sm ch1_unit_label"></label>
                        </div>
                    </div>
                    <label>Channel 2</label>
                    <div class="input-group input-group-sm mb-3 opacity">
                        <input class="form-control form-control-sm din_ch2_value" placeholder="Ch 2" disabled>
                        <div class="input-group-prepend">
                            <label class="input-group-text form-control-sm ch2_unit_label"></label>
                        </div>
                    </div>
                    <label>Channel 3</label>
                    <div class="input-group input-group-sm mb-3 opacity">
                        <input class="form-control form-control-sm din_ch3_value" placeholder="Ch 3" disabled>
                        <div class="input-group-prepend">
                            <label class="input-group-text form-control-sm ch3_unit_label"></label>
                        </div>
                    </div>
                </td>
                `;
        }
        else
        {
            template_td += dout_template(i);
            temp_template += `
                <td class="device_channel${i} em1" data-device="ma_device_c${i}" data-bank="${i}">
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input device_hb_check_status" id="device_hb_check_status${index}_${i}" data-check="${i}">
                        <label for="device_hb_check_status${index}_${i}" class="form-check-label ma_device_hb_check_status">H bridge</label>
                    </div>
                    <div class="form-group">
                        <label for="dout_mode_select${index}_${i}_1">CH1 Mode:</label>
                        <select class="form-control form-control-sm dout_mode_select dout_mode_select_1" id="dout_mode_select${index}_${i}_1" data-bank="${i}" data-channel="1">
                            <option value="0">Disabled</option>
                            <option value="1">Digital</option>
                            <option value="2">PWM</option>
                            <option value="3">Period</option>
                        </select>
                        
                        <div class="input-group input-group-sm mb-3 opacity do_freq_input_p do_freq_input_p_ch1 hidden">
                            <input class="form-control form-control-sm dout_pwm dout_pwm_ch1">
                            <div class="input-group-prepend">
                                <label class="input-group-text form-control-sm">Hz</label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ch1_dout_input_group hidden">
                        <label>Channel 1</label>
                        <div class="input-group input-group-sm mb-3 opacity">
                            <input class="form-control form-control-sm ch1_dout_unit_input" type="number" step="0.001" placeholder="Ch 1" data-deviceindex="${index}" data-bankindex="${i}">
                            <div class="input-group-prepend">
                                <label class="input-group-text form-control-sm ch1_dout_unit_label"></label>
                            </div>
                        </div>
                    </div>
                
                    <div class="form-group">
                        <label>CH1 State:</label>
                        <select class="form-control form-control-sm dout_ch1_select" data-deviceindex="${index}" data-bankindex="${i}">
                            <option value="0">HIZ</option>
                            <option value="1">Low reverse</option>
                            <option value="2">High forward</option>
                            <option value="3">Brake</option>
                        </select>
                    </div>
    
                    <hr>
                    <div class="dout_ch2_group">
                        <div class="form-group">
                            <label for="dout_mode_select${index}_${i}_2">CH2 Mode:</label>
                            <select class="form-control form-control-sm dout_mode_select dout_mode_select_2" id="dout_mode_select${index}_${i}_2" data-bank="${i}" data-channel="2">
                                <option value="0">Disabled</option>
                                <option value="1">Digital</option>
                                <option value="2">PWM</option>
                                <option value="3">Period</option>
                            </select>
                            
                            <div class="input-group input-group-sm mb-3 opacity do_freq_input_p do_freq_input_p_ch2 hidden">
                                <input class="form-control form-control-sm dout_pwm dout_pwm_ch2">
                                <div class="input-group-prepend">
                                    <label class="input-group-text form-control-sm">Hz</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="ch2_dout_input_group hidden">
                            <label>Channel 2</label>
                            <div class="input-group input-group-sm mb-3 opacity">
                                <input class="form-control form-control-sm ch2_dout_unit_input" type="number" step="0.001" placeholder="Ch 2" data-deviceindex="${index}" data-bankindex="${i}">
                                <div class="input-group-prepend">
                                    <label class="input-group-text form-control-sm ch2_dout_unit_label"></label>
                                </div>
                            </div>
                        </div>
                    
                        <div class="form-group">
                            <label for="dout_ch2_select${index}_${i}">CH2 State:</label>
                            <select class="form-control form-control-sm dout_ch2_select" id="dout_ch2_select${index}_${i}" data-deviceindex="${index}" data-bankindex="${i}">
                                <option value="0">HIZ</option>
                                <option value="1">Low reverse</option>
                                <option value="2">High forward</option>
                                <option value="3">Brake</option>
                            </select>
                        </div>
                    </div>
                    
                    <button type="button" class="btn btn-info dout_set_apply">Apply</button>
                </td>
                `;
        }

    }

    return  `
        <div class="flex">
            <div>
                <div class="ma_device_table_head ma_device_table_tab1 em15 d-inline-block pointer">
                    <span class="device_type" data-deviceType="${obj.deviceType}">RAD-IO2-DIO</span>
                    <span class="ma_device_serial_span" data-serial="${obj.serialNumber}">- ${obj.serialNumber}</span>
                </div><!--
             --><div class="ma_device_table_head_inv ma_device_table_tab2 em15 d-inline-block pointer">${def_lang.tab_dev_set}</div><!--
             --><div class="ma_device_table_head_inv ma_device_table_tab3 em15 d-inline-block pointer">${def_lang.tab_can_set}</div><!--
             --><div class="ma_device_table_head_inv ma_device_table_tab4 em15 d-inline-block pointer">${def_lang.text_moreinfo}</div>
            </div>
            <div>
                <button type="button" class="btn btn-success set_import hidden" tabindex="-1" data-toggle="tooltip" data-placement="top" title="${def_lang.device_setting_import}"><i class="fas fa-file-upload"></i></button>
                <button type="button" class="btn btn-success set_export hidden" tabindex="-1" data-toggle="tooltip" data-placement="top" title="${def_lang.device_setting_export}"><i class="fas fa-file-download"></i></button>
                <button type="button" class="btn btn-success can_export hidden" tabindex="-1" data-toggle="tooltip" data-placement="top" title="${def_lang.can_export}"><i class="fas fa-file-export"></i></button>
                <button type="button" class="btn btn-success device_save hidden" tabindex="-1" data-toggle="tooltip" data-placement="top" title="${def_lang.device_save}"><i class="fas fa-save"></i></button>
                <button type="button" class="btn btn-success device_default hidden" tabindex="-1" data-toggle="tooltip" data-placement="top" title="${def_lang.device_default}"><i class="fas fa-sync"></i></button>
            </div>
        </div>
        
        <table class="table table1">
            ${table_head}
            <tbody>
            </tbody>
        </table>
        
        <table class="table table2 hidden">
            ${table_head}
            <tbody>
                <tr class="row1">
                    ${template_td}
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="8">
                        <div class="form-group button-group">
                            <div class="input_selector_text offline em1" id="manualButton">${def_lang.setting_off}</div>
                            <div class="input_selector_bg device_group" data-type="${obj.deviceType}">
                                <img class="input_selector" src="../img/slide_1.png">
                                <input class="input_selector_value hidden" id="input_selector_value" value="0" disabled>
                            </div>
                            <div class="input_selector_text em1" id="interactiveButton">${def_lang.device_group}</div>
                        </div>
                    </td>
                </tr>
            </tfoot>
        </table>
        
        <table class="table table3 hidden">
            ${table_head}
            <tbody>
            <tr class="row2">
                ${can_td}
            </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td><label class="em1">${def_lang.can_fill}</label></td>
                    <td>
                        <select class="form-control form-control-sm auto_fill_cantype">
                            <option value="1">${def_lang.can_type_classic}</option>
                            <option value="2">CAN FD</option>
                        </select>
                    </td>
                    <td>
                        <select class="form-control form-control-sm auto_fill_canidtype">
                            <option value="3">Standard 11Bit</option>
                            <option value="4">Extended 29Bit</option>
                        </select>
                    </td>
                    <td>
                        <select class="form-control form-control-sm can_fill_select">
                            <option value="1">1 Bank</option>
                            <option value="2">2 Bank</option>
                            <option value="3">${def_lang.can_wdevice}</option>
                        </select>
                    </td>
                    <td> 
                        <div class="input-group input-group-sm mb-3 opacity">
                            <div class="input-group-prepend">
                                <label class="input-group-text form-control-sm canid_overide">0x</label>
                            </div>
                            <input class="form-control form-control-sm can_fill_id" placeholder="${def_lang.can_startid}">
                        </div>
                    </td>
                    <td>
                        <button type="button" class="btn btn-info btn-sm can_fill_apply">${def_lang.can_apply}</button>
                    </td>
                    <td colspan="2">
                        <div class="em15 status_text autofill_errortext"></div>
                    </td>
                </tr>
            </tfoot>
        </table>
        
        <table class="table table4 hidden">
            <div class="table4 hidden">
                <div class="card card-body em1">
                    <div>${def_lang.text_manufacture} ${obj.manufacture_month}/${obj.manufacture_day}/${obj.manufacture_year}</div>
                    <div>${def_lang.text_firmware_soft}: ${obj.firmwareVersion_major}.${obj.firmwareVersion_minor}</div>
                    <div>${def_lang.text_firmware_hard}: ${obj.hardwareRev_major}.${obj.hardwareRev_minor}</div>
                    <div>${def_lang.text_onlinetime}: <span class="ma_device_channel_time"></span></div>
                </div>
            </div>
        </table>
        
        <table class="table table5">
            <tbody>
                <tr>
                    ${temp_template}
                </tr>
            </tbody>
        </table>
    `;
};

dio_template.events = function(){
    $(".ma_device").on('change', '.dio_mode_select',function () {
        let that = $(this).parents('.ma_device_wrap');
        let type = parseInt($(that).attr('data-type'));
        let deviceID = parseInt($(that).attr('data-number'));
        let usbIndex = parseInt($(that).attr('data-usb'));
        let eachBankSettings = {};

        let which_bank = $(this).attr('data-bank');
        let which_channel = $(this).attr('data-channel');
        switch ($(this).val()) {
            case "1":
                $(that).find(`.table5 .device_channel${which_bank} .ch${which_channel}_unit_label`).html('');
                break;
            case "2":
                $(that).find(`.table5 .device_channel${which_bank} .ch${which_channel}_unit_label`).html('%');
                break;
            case "3":
                $(that).find(`.table5 .device_channel${which_bank} .ch${which_channel}_unit_label`).html('ms');
                break;
            case "4":
                $(that).find(`.table5 .device_channel${which_bank} .ch${which_channel}_unit_label`).html('Hz');
                break;
            case "5":
                $(that).find(`.table5 .device_channel${which_bank} .ch${which_channel}_unit_label`).html('V');
                break;
        }

        let mode1 = parseInt($(that).find(`.device_channel${which_bank} .dio_mode_select_1`).val());
        let mode2 = parseInt($(that).find(`.device_channel${which_bank} .dio_mode_select_2`).val());
        let mode3 = parseInt($(that).find(`.device_channel${which_bank} .dio_mode_select_3`).val());

        // 0 = mode
        // 1 = voltrig
        // 2 = prescaler
        eachBankSettings.channel1 = mode1;
        eachBankSettings.channel2 = mode2;
        eachBankSettings.channel3 = mode3;

        eachBankSettings.usbIndex = parseInt(usbIndex);
        eachBankSettings.bank = parseInt(which_bank);
        eachBankSettings.deviceType = type;
        eachBankSettings.deviceLink = deviceID - 1;
        eachBankSettings.status = globalObj.neoRADIO_status;

        globalObj.sendDINsettings(eachBankSettings);
    });

    $(".ma_device").on('change', '.dout_mode_select',function () {
        $(this).parent().find('.do_freq_input_p').addClass('hidden');
        $(this).parent().find('.do_oneshot_input_p').addClass('hidden');

        let which_bank = $(this).attr('data-bank');
        let which_channel = $(this).attr('data-channel');
        switch ($(this).val()) {
            case "1":
                $(this).parents('.ma_device_wrap').find(`.device_channel${which_bank} .ch${which_channel}_dout_input_group`).addClass('hidden');
                $(this).parents('.ma_device_wrap').find(`.device_channel${which_bank} .ch${which_channel}_dout_unit_label`).html('');
                break;
            case "2":
                $(this).parent().find('.do_freq_input_p').removeClass('hidden');
                $(this).parents('.ma_device_wrap').find(`.device_channel${which_bank} .ch${which_channel}_dout_input_group`).removeClass('hidden');
                $(this).parents('.ma_device_wrap').find(`.device_channel${which_bank} .ch${which_channel}_dout_unit_label`).html('%');
                break;
            case "3":
                $(this).parents('.ma_device_wrap').find(`.device_channel${which_bank} .ch${which_channel}_dout_input_group`).removeClass('hidden');
                $(this).parents('.ma_device_wrap').find(`.device_channel${which_bank} .ch${which_channel}_dout_unit_label`).html('ms');
                break;
        }
    });

    $(".ma_device").on('change', '.device_hb_check_status',function () {
        let value = $(this).prop('checked');
        let bank_value = $(this).attr('data-check');
        if(value)
        {
            $(this).parents('.dout_channels').find('.dout_ch2_group').addClass('hidden');
            $(this).parents('.ma_device_wrap').find(`.device_channel${bank_value} .dout_ch2_group`).addClass('hidden');
        }
        else
        {
            $(this).parents('.dout_channels').find('.dout_ch2_group').removeClass('hidden');
            $(this).parents('.ma_device_wrap').find(`.device_channel${bank_value} .dout_ch2_group`).removeClass('hidden');
        }
    });

    $(".ma_device").on("focus",".dio_mode_select_input", function () {
        $(this).select();
    });

    $(".ma_device").on("blur",".di_pwm_input_p", function () {
        if($(this).val() < 0 || $(this).val() > 100)
        {
            $(this).val("");
        }
    });

    $(".ma_device").on("blur",".di_freq_input_p", function () {
        if($(this).val() < 0 || $(this).val() > 65535)
        {
            $(this).val("");
        }
    });

    $(".ma_device").on('change', '.ch1_dout_unit_input',function () {
        let index = $(this).attr('data-deviceindex');
        let bank = $(this).attr('data-bankindex');
        $(`.ch1_dout_unit_input[data-deviceindex=${index}][data-bankindex=${bank}]`).val($(this).val());
    });

    $(".ma_device").on('change', '.dout_ch1_select',function () {
        let index = $(this).attr('data-deviceindex');
        let bank = $(this).attr('data-bankindex');
        $(`.dout_ch1_select[data-deviceindex=${index}][data-bankindex=${bank}]`).val($(this).val());
    });

    $(".ma_device").on('change', '.ch2_dout_unit_input',function () {
        let index = $(this).attr('data-deviceindex');
        let bank = $(this).attr('data-bankindex');
        $(`.ch2_dout_unit_input[data-deviceindex=${index}][data-bankindex=${bank}]`).val($(this).val());
    });

    $(".ma_device").on('change', '.dout_ch2_select',function () {
        let index = $(this).attr('data-deviceindex');
        let bank = $(this).attr('data-bankindex');
        $(`.dout_ch2_select[data-deviceindex=${index}][data-bankindex=${bank}]`).val($(this).val());
    });

    $('.ma_device').on('click','.ma_device_table_tab1',function(){
        $(this).parents('.ma_device_wrap').find('.table5 .ch1_dout_unit_input').attr('disabled',false);
        $(this).parents('.ma_device_wrap').find('.table5 .dout_ch1_select').attr('disabled',false);
        $(this).parents('.ma_device_wrap').find('.table5 .ch2_dout_unit_input').attr('disabled',false);
        $(this).parents('.ma_device_wrap').find('.table5 .dout_ch2_select').attr('disabled',false);
    });

    $('.ma_device').on('click','.ma_device_table_tab2',function(){
        $(this).parents('.ma_device_wrap').find('.table5 .ch1_dout_unit_input').attr('disabled',true);
        $(this).parents('.ma_device_wrap').find('.table5 .dout_ch1_select').attr('disabled',true);
        $(this).parents('.ma_device_wrap').find('.table5 .ch2_dout_unit_input').attr('disabled',true);
        $(this).parents('.ma_device_wrap').find('.table5 .dout_ch2_select').attr('disabled',true);
    });

    $('.ma_device').on('click','.dout_set_apply',function(){
        let that = $(this).parents('.ma_device_wrap');
        let bank = $(this).parents('.em1').attr('data-bank');

        let type = parseInt($(that).attr('data-type'));
        let deviceID = parseInt($(that).attr('data-number'));
        let usbIndex = parseInt($(that).attr('data-usb'));
        let eachBankSettings = {};

        let mode1 = parseInt($(that).find(`.device_channel${bank} .dout_mode_select_1`).val());
        let mode2 = parseInt($(that).find(`.device_channel${bank} .dout_mode_select_2`).val());
        let h_mode = $(that).find(`.device_channel${bank} .device_hb_check_status`).prop('checked');
        let freq1 = 0;
        let freq2 = 0;
        let data1 = parseInt($(that).find(`.device_channel${bank} .ch1_dout_unit_input`).val());
        let data2 = parseInt($(that).find(`.device_channel${bank} .ch2_dout_unit_input`).val());
        let state1 = parseInt($(that).find(`.device_channel${bank} .dout_ch1_select`).val());
        let state2 = parseInt($(that).find(`.device_channel${bank} .dout_ch2_select`).val());

        if (mode1 == 2)
        {
            freq1 = parseInt($(that).find(`.device_channel${bank} .dout_pwm_ch1`).val());
        }

        if (mode2 == 2)
        {
            freq2 = parseInt($(that).find(`.device_channel${bank} .dout_pwm_ch2`).val());
        }

        // 0 = mode
        // 1 = pwm or oneshot data
        // 2 = pwm freq
        // 3 = state
        eachBankSettings.channel1 = [mode1, isNaN(data1) ? 0 : data1, freq1, state1];
        eachBankSettings.channel2 = [mode2, isNaN(data2) ? 0 : data2, freq2, state2];
        eachBankSettings.channel3 = h_mode ? 1 : 0;

        eachBankSettings.usbIndex = parseInt(usbIndex);
        eachBankSettings.bank = parseInt(bank);
        eachBankSettings.deviceType = type;
        eachBankSettings.deviceLink = deviceID - 1;
        eachBankSettings.status = globalObj.neoRADIO_status;

        globalObj.sendDOUTsettings(eachBankSettings);
    });
};

module.exports = dio_template;