#include <cmath>
#include <neoRADIO2_frames.h>
#include "json.hpp"

uint8_t neoRADIO2GetBankDestination(uint8_t * x);
std::vector<float> neoRADIO2returnFloatData(uint8_t * rxdata[53], uint8_t * pointSize);
nlohmann::json neoRADIO2returnChainlistJSON(neoRADIO2_DeviceInfo * deviceInfo);
void neoRADIO2returnDataJSON(neoRADIO2_DeviceInfo * deviceInfo, nlohmann::json * returnData);
int neoRADIO2SetSettingsFromJSON(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData);
int neoRADIO2SetPwrRly(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData);
nlohmann::json neoRADIO2returnCalibrationJSON(neoRADIO2_DeviceInfo * deviceInfo, uint8_t * device, int * deviceType, uint16_t * deviceChannel, uint16_t * deviceRange);
int neoRADIO2SetCalibrationFromJSON(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData);
void neoRADIO2returnCalibrationDataJSON(neoRADIO2_DeviceInfo * deviceInfo, nlohmann::json * sample, std::string * messageData);
void neoRADIO2ClearCalibration(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData);
nlohmann::json neoRADIO2returnAllCalibrationJSON(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData);
void neoRADIO2SetCalibrationSinglePoint(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData);
void neoRADIO2SetAoutValue(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData);

using json = nlohmann::json;

uint8_t neoRADIO2GetBankDestination(uint8_t * x)
{
    return (uint8_t) 1 << ((* x) - 1);
}

std::vector<float> neoRADIO2returnFloatData(uint8_t * rxdata[53], uint8_t * pointSize)
{
    auto * z = new bytesToFloat[* pointSize];
    std::vector<float> allpoints;

    for(int i = 0; i < * pointSize; i++)
    {
        for(int j = 0; j < 4; j++)
        {
            z[i].b[j] = (* rxdata)[j + i * 4];
        }

        allpoints.push_back(z[i].fp);
    }

    delete []z;
    return allpoints;
}

nlohmann::json neoRADIO2returnChainlistJSON(neoRADIO2_DeviceInfo * deviceInfo)
{
    json devices;
    std::string device = "device";
    std::string channel = "channel";
    std::string concatenateI,concatenateJ;

    devices["State"] = deviceInfo->State;
    devices["maxID_Device"] = deviceInfo->LastDevice + 1;
    devices["maxID_Chip"] = deviceInfo->LastBank;

    for(int i = 0; i <= deviceInfo->LastDevice; i++)
    {
        for(int j = 0; j < 8; j++)
        {
            concatenateI = device + std::to_string(i);
            concatenateJ = channel + std::to_string(j);
            char serial[7] = {0};
            neoRADIO2SerialToString(serial, deviceInfo->ChainList[i][j].serialNumber);

            devices["chainlist"][concatenateI][concatenateJ]["serialNumber"] = std::string(serial);
            devices["chainlist"][concatenateI][concatenateJ]["manufacture_year"] = deviceInfo->ChainList[i][j].manufacture_year;
            devices["chainlist"][concatenateI][concatenateJ]["manufacture_day"] = deviceInfo->ChainList[i][j].manufacture_day;
            devices["chainlist"][concatenateI][concatenateJ]["manufacture_month"] = deviceInfo->ChainList[i][j].manufacture_month;
            devices["chainlist"][concatenateI][concatenateJ]["deviceType"] = deviceInfo->ChainList[i][j].deviceType;
            devices["chainlist"][concatenateI][concatenateJ]["firmwareVersion_major"] = deviceInfo->ChainList[i][j].firmwareVersion_major;
            devices["chainlist"][concatenateI][concatenateJ]["firmwareVersion_minor"] = deviceInfo->ChainList[i][j].firmwareVersion_minor;
            devices["chainlist"][concatenateI][concatenateJ]["hardwareRev_major"] = deviceInfo->ChainList[i][j].hardwareRev_major;
            devices["chainlist"][concatenateI][concatenateJ]["status"] = deviceInfo->ChainList[i][j].status;
            devices["chainlist"][concatenateI][concatenateJ]["settingsValid"] = deviceInfo->ChainList[i][j].settingsState;
            devices["chainlist"][concatenateI][concatenateJ]["settingsReportRate"] = deviceInfo->ChainList[i][j].settings.config.poll_rate_ms;
            devices["chainlist"][concatenateI][concatenateJ]["settingsCanArbid"] = deviceInfo->ChainList[i][j].settings.can.Arbid;
            devices["chainlist"][concatenateI][concatenateJ]["settingsCanLocation"] = deviceInfo->ChainList[i][j].settings.can.Location;
            devices["chainlist"][concatenateI][concatenateJ]["settingsCanMsgType"] = deviceInfo->ChainList[i][j].settings.can.msgType;

            std::u32string Name;
            int stringlen = deviceInfo->ChainList[i][j].settings.name1.length;
            switch (deviceInfo->ChainList[i][j].settings.name1.charSize)
            {
                case 1:
                {
                    if (stringlen > 64)
                        stringlen = 64;
                    for (int c = 0; c < stringlen; c++)
                    {
                        Name += (char)deviceInfo->ChainList[i][j].settings.name1.chars.u8[c];
                    }
                    break;
                }
                case 2:
                {
                    if (stringlen > 32)
                        stringlen = 32;
                    for (int c = 0; c < stringlen; c++)
                    {
                        Name += (char16_t)deviceInfo->ChainList[i][j].settings.name1.chars.u16[c];
                    }
                    break;
                }
                case 4:
                {
                    if (stringlen > 16)
                        stringlen = 16;
                    for (int c = 0; c < stringlen; c++)
                    {
                        Name += (char32_t)deviceInfo->ChainList[i][j].settings.name1.chars.u32[c];
                    }
                    break;
                }
                default:
                    break;
            }

            devices["chainlist"][concatenateI][concatenateJ]["settingsNameArray"] = Name;
            devices["chainlist"][concatenateI][concatenateJ]["settingsNameArraySize"] = deviceInfo->ChainList[i][j].settings.name1.charSize;
            devices["chainlist"][concatenateI][concatenateJ]["settingsNameLength"] = deviceInfo->ChainList[i][j].settings.name1.length;
            devices["chainlist"][concatenateI][concatenateJ]["settingsEnables"] = deviceInfo->ChainList[i][j].settings.config.channel_1_config;

            if(deviceInfo->ChainList[i][0].deviceType == NEORADIO2_DEVTYPE_AOUT)
            {
                neoRADIO2AOUT_channelConfig Channel1 = {0}, Channel2 = {0}, Channel3 = {0};
                Channel1.u32 = deviceInfo->ChainList[i][j].settings.config.channel_1_config;
                Channel2.u32 = deviceInfo->ChainList[i][j].settings.config.channel_2_Config;
                Channel3.u32 = deviceInfo->ChainList[i][j].settings.config.channel_3_Config;

                devices["chainlist"][concatenateI][concatenateJ]["settings1"]["enabled"] = Channel1.data.enabled;
                devices["chainlist"][concatenateI][concatenateJ]["settings1"]["initEnabled"] = Channel1.data.initEnabled;
                devices["chainlist"][concatenateI][concatenateJ]["settings1"]["initOutputValue"] = Channel1.data.initOutputValue;

                devices["chainlist"][concatenateI][concatenateJ]["settings2"]["enabled"] = Channel2.data.enabled;
                devices["chainlist"][concatenateI][concatenateJ]["settings2"]["initEnabled"] = Channel2.data.initEnabled;
                devices["chainlist"][concatenateI][concatenateJ]["settings2"]["initOutputValue"] = Channel2.data.initOutputValue;

                devices["chainlist"][concatenateI][concatenateJ]["settings3"]["enabled"] = Channel3.data.enabled;
                devices["chainlist"][concatenateI][concatenateJ]["settings3"]["initEnabled"] = Channel3.data.initEnabled;
                devices["chainlist"][concatenateI][concatenateJ]["settings3"]["initOutputValue"] = Channel3.data.initOutputValue;
            }
        }

        char deviceserial[7] = {0};
        neoRADIO2SerialToString(deviceserial, deviceInfo->ChainList[i][0].serialNumber);
        devices["serialNumber"][i] = std::string(deviceserial);
        devices["manufacture_year"][i] = deviceInfo->ChainList[i][0].manufacture_year;
        devices["manufacture_month"][i] = deviceInfo->ChainList[i][0].manufacture_month;
        devices["manufacture_day"][i] = deviceInfo->ChainList[i][0].manufacture_day;
        devices["firmwareVersion_major"][i] = deviceInfo->ChainList[i][0].firmwareVersion_major;
        devices["firmwareVersion_minor"][i] = deviceInfo->ChainList[i][0].firmwareVersion_minor;

        if(deviceInfo->ChainList[i][0].deviceType == NEORADIO2_DEVTYPE_PWRRLY)
        {
            neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_READ_DATA, i, 0x01, NULL, 0);
            bool timeout = true;
            while(timeout)
            {
                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                neoRADIO2ProcessIncomingData(deviceInfo, 1000);
                if (deviceInfo->rxDataCount > 0 && deviceInfo->State == neoRADIO2state_Connected)
                {
                    for (unsigned int c = 0; c < deviceInfo->rxDataCount; c++)
                    {
                        if(deviceInfo->rxDataBuffer[c].header.start_of_frame == 0x55 && deviceInfo->rxDataBuffer[c].header.command_status == NEORADIO2_STATUS_SENSOR)
                        {
                            devices["PWRRLY_STATUS"][i] = deviceInfo->rxDataBuffer[c].data[0];
                            timeout = false;
                        }
                    }
                }
            }
        }
    }

    return devices;
}

void neoRADIO2returnDataJSON(neoRADIO2_DeviceInfo * deviceInfo, nlohmann::json * returnData)
{
    std::string device = "device";
    std::string channel = "channel";
    std::string concatenateI,concatenateJ;

    for(int i = 0; i <= deviceInfo->LastDevice; i++)
    {
        concatenateI = device + std::to_string(i);
        (*returnData)["chainlist"][concatenateI]["deviceType"] = deviceInfo->ChainList[i][0].deviceType;
    }

    (*returnData)["State"] = deviceInfo->State;
    (*returnData)["maxID_Device"] = deviceInfo->LastDevice + 1;
    (*returnData)["tempData"]["Timeus"] = deviceInfo->Timeus / 1000;

    for (int i = 0; i < deviceInfo->rxDataCount; i++)
    {
        std::string concatenateD;
        std::string concatenateC;

        if(deviceInfo->rxDataBuffer[i].header.start_of_frame == 0x55)
        {
            concatenateD = device + std::to_string(deviceInfo->rxDataBuffer[i].header.device);
            concatenateC = channel + std::to_string(deviceInfo->rxDataBuffer[i].header.bank);
            bytesToFloat temp;

            temp.b[0] = deviceInfo->rxDataBuffer[i].data[0];
            temp.b[1] = deviceInfo->rxDataBuffer[i].data[1];
            temp.b[2] = deviceInfo->rxDataBuffer[i].data[2];
            temp.b[3] = deviceInfo->rxDataBuffer[i].data[3];

            (*returnData)["tempData"][concatenateD][concatenateC] = temp.fp;
            if(std::isinf(temp.fp))
            {
                (*returnData)["tempData"][concatenateD][concatenateC] = "inf";
            }
        }
    }
}

int neoRADIO2SetSettingsFromJSON(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData)
{
    try
    {
        uint8_t enables;

        json settingsData = json::parse(* messageData);
        auto settingsBank = settingsData["bank"].get<unsigned int>();
        auto settingsDeviceNumber = settingsData["deviceLink"].get<unsigned int>();
        auto settingsReportRate = settingsData["reportRate"].get<unsigned int>();
        auto settingsEnables = settingsData["enables"].get<unsigned int>();
        auto settingsDeviceType = settingsData["deviceType"].get<unsigned int>();
        auto settingsCanId = settingsData["CanId"].get<unsigned int>();
        auto settingsCanMsgType = settingsData["CanMsgType"].get<unsigned int>();
        auto settingsCanLocation = settingsData["CanLocation"].get<unsigned int>();
        auto settingsTagName = settingsData["tagName"].get<std::vector<unsigned int>>();

        switch (settingsDeviceType)
        {
            case NEORADIO2_DEVTYPE_TC:
            {
                if(settingsEnables == 0)
                {
                    enables = NEORADIO2TC_CONFIG_DISABLE;
                }
                else
                {
                    enables = NEORADIO2TC_CONFIG_TC;
                }
                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.config.channel_1_config = enables;
            }
                break;

            case NEORADIO2_DEVTYPE_PWRRLY:
            {

            }
                break;

            case NEORADIO2_DEVTYPE_AIN:
            {
                if(settingsEnables == 0)
                {
                    enables = NEORADIO2AIN_CONFIG_DISABLE;
                }
                else
                {
                    enables = settingsEnables;
                }
                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.config.channel_1_config = enables;
            }
                break;

            case NEORADIO2_DEVTYPE_AOUT:
            {
                auto settingsExtraArray = settingsData["extraSettings"].get<std::vector<unsigned int>>();
                neoRADIO2AOUT_channelConfig channel1 = {0}, channel2 = {0}, channel3 = {0};
                channel1.u32 = deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.config.channel_1_config;
                channel2.u32 = deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.config.channel_2_Config;
                channel3.u32 = deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.config.channel_3_Config;

                if(settingsExtraArray[0] == 0)
                {
                    channel1.data.enabled = 0x00;
                }
                else
                {
                    channel1.data.enabled = 0x01;
                }

                if(settingsExtraArray[1] == 0)
                {
                    channel2.data.enabled = 0x00;
                }
                else
                {
                    channel2.data.enabled = 0x01;
                }

                if(settingsExtraArray[2] == 0)
                {
                    channel3.data.enabled = 0x00;
                }
                else
                {
                    channel3.data.enabled = 0x01;
                }

                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.config.channel_1_config = channel1.u32;
                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.config.channel_2_Config = channel2.u32;
                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.config.channel_3_Config = channel3.u32;

                int timeout = 200;
                while(timeout--)
                {
                    std::this_thread::sleep_for(std::chrono::milliseconds(1));
                    neoRADIO2ProcessIncomingData(deviceInfo, 1000);
                }
            }
                break;

            case NEORADIO2_DEVTYPE_CANHUB:
            {
                auto settingsExtraArray = settingsData["extraSettings"].get<std::vector<std::vector<unsigned int>>>();
                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.config.channel_1_config = enables;
            }
                break;

            default:
                break;
        }

        deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.charSize = 1;
        for(int i = 0; i < settingsTagName.size(); i++)
        {
            if(settingsTagName[i] > 255)
            {
                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.charSize = 4;
            }
        }

        if(deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.charSize == 4)
        {
            deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.length = settingsTagName.size();
            if(settingsTagName.size() > 16)
            {
                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.length = 16;
            }
            for(int i = 0; i < deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.length; i++)
            {
                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.chars.u32[i] = settingsTagName[i];
            }
        }
        else // charSize is 1
        {
            deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.length = settingsTagName.size();
            if(settingsTagName.size() > 64)
            {
                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.length = 64;
            }
            for(int i = 0; i < deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.length; i++)
            {
                deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.name1.chars.u8[i] = settingsTagName[i];
            }
        }

        deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.config.poll_rate_ms = settingsReportRate;
        deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.can.Arbid = settingsCanId;
        deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.can.msgType = settingsCanMsgType;
        deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settings.can.Location = settingsCanLocation;
        deviceInfo->ChainList[settingsDeviceNumber][settingsBank].settingsState = neoRADIO2Settings_NeedsWrite;

        return settingsBank;
    }
    catch(const std::exception& e)
    {
        std::cout << "Caught exception " << e.what() << std::endl;
        return -1;
    }
}

int neoRADIO2SetPwrRly(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData)
{
    try
    {
        json settingsData = json::parse(* messageData);
        uint8_t settingsDeviceNumber = settingsData["deviceLink"].get<unsigned int>();
        auto settingsExtraArray = settingsData["extraSettings"].get<std::vector<unsigned int>>();
        uint8_t buf[2];
        buf[0] = 0xFF;
        buf[1] = settingsExtraArray[1]; //current state

        neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_WRITE_DATA, settingsDeviceNumber, 1, (uint8_t *) &buf, sizeof(buf));
        return 0;
    }
    catch(const std::exception& e)
    {
        std::cout << "Caught exception " << e.what() << std::endl;
        return -1;
    }
}

nlohmann::json neoRADIO2returnCalibrationJSON(neoRADIO2_DeviceInfo * deviceInfo, uint8_t * device, int * deviceType, uint16_t * deviceChannel, uint16_t * deviceRange)
{
    json devices;

    try
    {
        std::string concatenateJ;
        uint8_t txdata[64];
        neoRADIO2frame_calHeader * calhead = (neoRADIO2frame_calHeader *)txdata;
        switch (*deviceType)
        {
            case NEORADIO2_DEVTYPE_TC:
                calhead->channel = 0;
                calhead->range = 0;
                calhead->cal_type_size = sizeof(float);
                break;
            case NEORADIO2_DEVTYPE_AIN:
                calhead->channel = 0;
                calhead->range = *deviceRange;
                calhead->cal_type_size = sizeof(float);
                break;
            case NEORADIO2_DEVTYPE_AOUT:
                calhead->channel = *deviceChannel;
                calhead->range = *deviceRange;
                calhead->cal_type_size = sizeof(uint32_t);
                break;
        }
        neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_READ_CALPOINTS, *device, 0xFF, (uint8_t *) &txdata, sizeof(neoRADIO2frame_calHeader));
        int timeout = 200;
        while(timeout--)
        {
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
            neoRADIO2ProcessIncomingData(deviceInfo, 1000);
            if (deviceInfo->rxDataCount > 0 && deviceInfo->State == neoRADIO2state_Connected)
            {
                for (unsigned int c = 0; c < deviceInfo->rxDataCount; c++)
                {
                    if(deviceInfo->rxDataBuffer[c].header.start_of_frame == 0x55 && deviceInfo->rxDataBuffer[c].header.command_status == NEORADIO2_STATUS_CALPOINTS)
                    {
                        uint8_t * rxdata = &deviceInfo->rxDataBuffer[c].data[sizeof(neoRADIO2frame_calHeader)];
                        devices["calpoints"] = neoRADIO2returnFloatData(&rxdata, &(deviceInfo->rxDataBuffer[c].data[0]));
                        timeout = 0;
                    }

                    //calibration invalid
                    if(deviceInfo->rxDataBuffer[c].header.start_of_frame == 0x55 && deviceInfo->rxDataBuffer[c].header.command_status == NEORADIO2_STATUS_CAL)
                    {
                        devices["calpoints"] = "invalid";
                        timeout = 0;
                    }
                }
            }
        }
        for(uint8_t bank = 1; bank < 9; bank++)
        {
            uint8_t destination = neoRADIO2GetBankDestination(&bank);
            neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_READ_CAL, *device, destination, (uint8_t *) &txdata, sizeof(neoRADIO2frame_calHeader));
            timeout = 100;
            while(timeout--)
            {
                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                neoRADIO2ProcessIncomingData(deviceInfo, 1000);
                if (deviceInfo->rxDataCount > 0)
                {
                    for (int c = 0; c < deviceInfo->rxDataCount; c++)
                    {
                        if(deviceInfo->rxDataBuffer[c].header.start_of_frame == 0x55 && deviceInfo->rxDataBuffer[c].header.command_status == NEORADIO2_STATUS_CAL)
                        {
                            uint8_t * rxdata = &deviceInfo->rxDataBuffer[c].data[sizeof(neoRADIO2frame_calHeader)];
                            concatenateJ = std::to_string(deviceInfo->rxDataBuffer[c].header.bank);
                            devices["datapoints"][concatenateJ]["datapoints"] = neoRADIO2returnFloatData(&rxdata, &(deviceInfo->rxDataBuffer[c].data[0]));
                            timeout = 0;
                        }
                    }
                }
            }
        }
        devices["type"] = *deviceType;

        return devices;
    }
    catch(const std::exception& e)
    {
        std::cout << "Caught exception " << e.what() << std::endl;
        return devices;
    }
}

int neoRADIO2SetCalibrationFromJSON(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData)
{
    try
    {
        json settingsData = json::parse(* messageData);
        uint8_t device = settingsData["device"].get<unsigned int>();
        auto points = settingsData["pt_array"].get<std::vector<float>>();

        if(points.empty() == true)
        {
            return -1;
        }

        uint8_t deviceType = settingsData["type"].get<unsigned int>();
        uint16_t deviceChannel = settingsData["deviceChannel"].get<unsigned int>();
        uint16_t deviceRange = settingsData["deviceRange"].get<unsigned int>();
        uint8_t pointsSize = points.size();
        uint8_t txdata[64];
        neoRADIO2frame_calHeader * calhead = (neoRADIO2frame_calHeader *)txdata;
        calhead->num_of_pts = pointsSize;

        switch (deviceType)
        {
            case NEORADIO2_DEVTYPE_TC:
                calhead->channel = 0;
                calhead->range = 0;
                calhead->cal_type_size = sizeof(float);
                break;
            case NEORADIO2_DEVTYPE_AIN:
                calhead->channel = deviceChannel;
                calhead->range = deviceRange;
                calhead->cal_type_size = sizeof(float);
                break;
            case NEORADIO2_DEVTYPE_AOUT:
                calhead->channel = deviceChannel;
                calhead->range = deviceRange;
                calhead->cal_type_size = sizeof(uint32_t);
                break;
        }

        unsigned int txlen = sizeof(neoRADIO2frame_calHeader) + points.size() * sizeof(decltype(points)::value_type);
        memcpy(&txdata[sizeof(neoRADIO2frame_calHeader)], &points[0], sizeof(points));

        neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_WRITE_CALPOINTS, device, 0xFF, (uint8_t *) &txdata, txlen);

        int timeout = 50;
        while(timeout--)
        {
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
            neoRADIO2ProcessIncomingData(deviceInfo, 1000);
        }

        auto bank1 = settingsData["bank1"].get<std::vector<float>>();
        auto bank2 = settingsData["bank2"].get<std::vector<float>>();
        auto bank3 = settingsData["bank3"].get<std::vector<float>>();
        auto bank4 = settingsData["bank4"].get<std::vector<float>>();
        auto bank5 = settingsData["bank5"].get<std::vector<float>>();
        auto bank6 = settingsData["bank6"].get<std::vector<float>>();
        auto bank7 = settingsData["bank7"].get<std::vector<float>>();
        auto bank8 = settingsData["bank8"].get<std::vector<float>>();
        std::vector<std::vector<float>> allbanks {bank1,bank2,bank3,bank4,bank5,bank6,bank7,bank8};

        for(uint8_t bank = 1; bank < 9; bank++)
        {
            uint8_t destination = neoRADIO2GetBankDestination(&bank);
            txlen = sizeof(neoRADIO2frame_calHeader) + allbanks[bank - 1].size() * calhead->cal_type_size;
            memcpy(&txdata[sizeof(neoRADIO2frame_calHeader)], &allbanks[bank - 1][0], allbanks[bank - 1].size() * calhead->cal_type_size);
            neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_WRITE_CAL, device, destination, (uint8_t *) &txdata, txlen);
            timeout = 100;
            while(timeout--)
            {
                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                neoRADIO2ProcessIncomingData(deviceInfo, 1000);
            }
        }

        neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_STORE_CAL, device, 0xFF, (uint8_t *) &txdata, txlen);

        timeout = 300;
        while(timeout--)
        {
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
            neoRADIO2ProcessIncomingData(deviceInfo, 1000);
        }

        return deviceRange;
    }
    catch(const std::exception& e)
    {
        std::cout << "Caught exception " << e.what() << std::endl;
        return -1;
    }
}

void neoRADIO2returnCalibrationDataJSON(neoRADIO2_DeviceInfo * deviceInfo, nlohmann::json * sample, std::string * messageData)
{
    try
    {
        json settingsData = json::parse(* messageData);
        uint8_t device = settingsData["device"].get<unsigned int>();
        uint8_t bank = settingsData["bank"].get<unsigned int>();
        uint8_t deviceType = settingsData["type"].get<unsigned int>();
        uint8_t buf[1] = { NEORADIO2CALTYPE_NOCAL_ENHANCED };

        neoRADIO2SetOnline(deviceInfo, 0);
        uint8_t destination = neoRADIO2GetBankDestination(&bank);
        neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_READ_DATA, device, destination, buf, sizeof(buf));
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        neoRADIO2ProcessIncomingData(deviceInfo, 1000);
        (*sample)["type"] = deviceType;

        if (deviceInfo->rxDataCount > 0 && deviceInfo->State == neoRADIO2state_Connected)
        {
            for (int i = 0; i < deviceInfo->rxDataCount; i++)
            {
                if(deviceInfo->rxDataBuffer[i].header.start_of_frame == 0x55 && deviceInfo->rxDataBuffer[i].header.command_status == NEORADIO2CALTYPE_ENABLED)
                {
                    bytesToFloat value;
                    value.b[0] = deviceInfo->rxDataBuffer[i].data[0];
                    value.b[1] = deviceInfo->rxDataBuffer[i].data[1];
                    value.b[2] = deviceInfo->rxDataBuffer[i].data[2];
                    value.b[3] = deviceInfo->rxDataBuffer[i].data[3];
                    (*sample)["tempData"] = value.fp;
                    (*sample)["bank"] = deviceInfo->rxDataBuffer[i].header.bank;
                }
            }
        }
    }
    catch(const std::exception& e)
    {
        std::cout << "Caught exception " << e.what() << std::endl;
    }
}

void neoRADIO2ClearCalibration(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData)
{
    json settingsData = json::parse(* messageData);
    uint8_t device = settingsData["device"].get<unsigned int>();
    neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_CLEAR_CAL, device, 0xFF, NULL, 0);
    int timeout = 100;
    while(timeout--)
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        neoRADIO2ProcessIncomingData(deviceInfo, 1000);
    }

    neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_STORE_CAL, device, 0xFF, NULL, 0);

    timeout = 500;
    while(timeout--)
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        neoRADIO2ProcessIncomingData(deviceInfo, 1000);
    }
}

nlohmann::json neoRADIO2returnAllCalibrationJSON(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData)
{
    json devices;
    json settingsData = json::parse(* messageData);
    uint8_t device = settingsData["device"].get<unsigned int>();
    int deviceType = settingsData["type"].get<unsigned int>();
    uint16_t deviceChannel = settingsData["deviceChannel"].get<unsigned int>();
    uint16_t deviceRange = settingsData["deviceRange"].get<unsigned int>();
    devices["type"] = settingsData["type"].get<unsigned int>();

    if(deviceType == NEORADIO2_DEVTYPE_AIN)
    {
        for(int c = 0; c < 6; c++)
        {
            devices["data"][std::to_string(c)] = neoRADIO2returnCalibrationJSON(deviceInfo, &device, &deviceType, &deviceChannel,(uint16_t *) &c);
        }
    }
    else
    {
        devices["data"]["0"] = neoRADIO2returnCalibrationJSON(deviceInfo, &device, &deviceType, &deviceChannel, &deviceRange);
    }

    return devices;
}

void neoRADIO2SetCalibrationSinglePoint(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData)
{
    json settingsData = json::parse(* messageData);
    uint8_t device = settingsData["device"].get<unsigned int>();
    uint8_t bank = settingsData["bank"].get<unsigned int>();
    uint8_t deviceType = settingsData["type"].get<unsigned int>();
    uint16_t deviceChannel = settingsData["deviceChannel"].get<unsigned int>();
    uint16_t deviceRange = settingsData["deviceRange"].get<unsigned int>();
    uint8_t points = settingsData["point"].get<unsigned int>();
    uint8_t txdata[64];

    neoRADIO2frame_calHeader * calhead = (neoRADIO2frame_calHeader *)txdata;
    calhead->num_of_pts = 1;

    switch (deviceType)
    {
        case NEORADIO2_DEVTYPE_TC:
            calhead->channel = 0;
            calhead->range = 0;
            calhead->cal_type_size = sizeof(float);
            break;
        case NEORADIO2_DEVTYPE_AIN:
            calhead->channel = deviceChannel;
            calhead->range = deviceRange;
            calhead->cal_type_size = sizeof(float);
            break;
        case NEORADIO2_DEVTYPE_AOUT:
            calhead->channel = deviceChannel;
            calhead->range = deviceRange;
            calhead->cal_type_size = sizeof(uint32_t);
            break;
    }

    unsigned int txlen = sizeof(neoRADIO2frame_calHeader) + sizeof(points);
    memcpy(&txdata[sizeof(neoRADIO2frame_calHeader)], &points, sizeof(points));
    neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_WRITE_CALPOINTS, device, 0xFF, (uint8_t *) &txdata, txlen);

    int timeout = 50;
    while(timeout--)
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        neoRADIO2ProcessIncomingData(deviceInfo, 1000);
    }

    uint8_t destination = neoRADIO2GetBankDestination(&bank);
    txlen = sizeof(neoRADIO2frame_calHeader) + calhead->cal_type_size;
    memcpy(&txdata[sizeof(neoRADIO2frame_calHeader)], &points, calhead->cal_type_size);
    neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_WRITE_CAL, device, destination, (uint8_t *) &txdata, txlen);
    timeout = 50;
    while(timeout--)
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        neoRADIO2ProcessIncomingData(deviceInfo, 1000);
    }

    neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_STORE_CAL, device, 0xFF, (uint8_t *) &txdata, txlen);

    timeout = 100;
    while(timeout--)
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        neoRADIO2ProcessIncomingData(deviceInfo, 1000);
    }
}

void neoRADIO2SetAoutValue(neoRADIO2_DeviceInfo * deviceInfo, std::string * messageData)
{
    try
    {
        json settingsData = json::parse(* messageData);
        uint8_t settingsBank = settingsData["bank"].get<unsigned int>();
        uint8_t settingsDeviceNumber = settingsData["deviceLink"].get<unsigned int>();
        auto settingsExtraArray = settingsData["extraSettings"].get<std::vector<unsigned int>>();

        uint16_t setbuf[3] = {0};
        setbuf[0] = settingsExtraArray[0];
        setbuf[1] = settingsExtraArray[1];
        setbuf[2] = settingsExtraArray[2];

        neoRADIO2AOUT_header aout_header = {0};
        uint8_t  txbuf[7] = {0};

        aout_header.bits.ch1 = 1;
        aout_header.bits.ch2 = 1;
        aout_header.bits.ch3 = 1;

        txbuf[0] = aout_header.byte;
        txbuf[1] = static_cast<uint8_t>(setbuf[0] >> 8);
        txbuf[2] = static_cast<uint8_t>(setbuf[0]);
        txbuf[3] = static_cast<uint8_t>(setbuf[1] >> 8);
        txbuf[4] = static_cast<uint8_t>(setbuf[1]);
        txbuf[5] = static_cast<uint8_t>(setbuf[2] >> 8);
        txbuf[6] = static_cast<uint8_t>(setbuf[2]);

        uint8_t destination = neoRADIO2GetBankDestination(&settingsBank);
        neoRADIO2SendPacket(deviceInfo, NEORADIO2_COMMAND_WRITE_DATA, settingsDeviceNumber, destination, (uint8_t *) &txbuf, sizeof(txbuf));

        int timeout = 300;
        while(timeout--)
        {
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
            neoRADIO2ProcessIncomingData(deviceInfo, 1000);
        }
    }
    catch(const std::exception& e)
    {
        std::cout << "Caught exception " << e.what() << std::endl;
    }
}