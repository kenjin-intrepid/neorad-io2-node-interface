#include "neoRAD-IO2_PacketHandler.h"
#include "neoRAD-IO2-TC.h"
#include "neoRAD-IO2-AIN.h"
#include "neoRAD-IO2-AOUT.h"
#include "neoRAD-IO2-PWRRLY.h"
#include "neoRAD-IO2-DIO.h"
#include <iostream>
#include <chrono>
#include <thread>
#include <cstdlib>
#include <sstream>
#include "worker.h"
#include "functions.h"
#include "json.hpp"
#include <nan.h>

using json = nlohmann::json;

class Sensor : public DataWorker
{
    public:
        Sensor(Nan::Callback *data, Nan::Callback *complete) : DataWorker(data, complete){}

    void Execute (const Nan::AsyncProgressWorker::ExecutionProgress &progress)
    {
        enum deviceState {
            DeviceIdle = 0,
            DeviceInit = 1,
            DeviceReload = 2,
            DeviceOnline = 3,
            SendSettings = 4,
            CalInteractive = 5,
            CalReadSettings = 6,
            CalSendSettings = 7,
            ClearCal = 8,
            SetPwrRly = 9,
            SetAout = 10,
            SetDIN = 11,
            SetDOUT = 12,
            LoadDefault = 13
        };
        std::string messageData;
        int messageName, result, Devices = 0, InitRetry = 0, neoRADIO2_state = DeviceIdle;
        bool deviceConnected = true;
        json return_measured_data;
        neoRADIO2_USBDevice deviceLinked[8];
        neoRADIO2_DeviceInfo deviceInfo[8];
        auto last = std::chrono::steady_clock::now();
        memset(&deviceLinked, 0, sizeof(deviceLinked));
        memset(&deviceInfo, 0 ,sizeof(deviceInfo));

        while (deviceConnected)
        {
            if(fromNode.haveDataFromNode())
            {
                CustomMessage messageFromNode = fromNode.read();
                messageName = std::stoi(messageFromNode.name);
                messageData = messageFromNode.data;
                neoRADIO2_state = messageName;
            }

            switch (neoRADIO2_state)
            {
                case DeviceIdle:
                {
                    int currentStat;
                    if(Devices > 0)
                    {
                        if(result == 0)
                        {
                            for (int i = 0; i < Devices; i++)
                            {
                                neoRADIO2SetOnline(&deviceInfo[i], 0);
                                currentStat = neoRADIO2ProcessIncomingData(&deviceInfo[i], 1000);
                                if(deviceInfo[i].State == neoRADIO2state_Connected)
                                {
                                    if (currentStat == -1)
                                    {
                                        deviceConnected = false;
                                    }
                                }
                            }
                        }
                    }
                    std::this_thread::sleep_for(chrono::milliseconds(1));
                }
                    break;

                case DeviceInit:
                {
                    json devices;
                    Devices = neoRADIO2FindDevices(deviceLinked, 8);
                    if(Devices > 0)
                    {
                        int offlineDevices = 0;
                        for (int i = 0; i < Devices; i++)
                        {
                            memcpy(&deviceInfo[i].usbDevice, &deviceLinked[i], sizeof(neoRADIO2_USBDevice));
                            result = neoRADIO2ConnectDevice(&deviceInfo[i]);
                            unsigned int timeout = 1000;
                            while(deviceInfo[i].State != neoRADIO2state_Connected && timeout > 0)
                            {
                                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                                result = neoRADIO2ProcessIncomingData(&deviceInfo[i], 1000);
                                timeout--;
                            }
                            unsigned int timeout2 = 1000;
                            neoRADIO2RequestSettings(&deviceInfo[i]);
                            while(deviceInfo[i].State != neoRADIO2state_Connected && timeout2 > 0)
                            {
                                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                                result = neoRADIO2ProcessIncomingData(&deviceInfo[i], 1000);
                                timeout2--;
                            }
                            if(deviceInfo[i].State != neoRADIO2state_Connected)
                            {
                                offlineDevices++;
                            }
                            //TODO: all devices returns error code
                            devices["usb" + std::to_string(i)] = neoRADIO2returnChainlistJSON(&deviceInfo[i]);
                        }
                        if(offlineDevices == Devices)
                        {
                            deviceConnected = false;
                            CustomMessage sendError("error_msg", "102");
                            writeToNode(progress, sendError);
                        }
                        else
                        {
                            CustomMessage sendFound("device_found", devices.dump());
                            writeToNode(progress, sendFound);
                        }
                        neoRADIO2_state = DeviceIdle;
                    }
                    else
                    {
                        if(InitRetry > 500)
                        {
                            CustomMessage sendError("error_msg", "101");
                            writeToNode(progress, sendError);
                            neoRADIO2_state = DeviceIdle;
                            deviceConnected = false;
                        }
                        else
                        {
                            neoRADIO2_state = DeviceInit;
                            InitRetry++;
                        }
                    }
                }
                    break;

                case DeviceOnline:
                {
                    bool returnValueOfData = false;
                    auto current = std::chrono::steady_clock::now();
                    auto diff = std::chrono::duration_cast<std::chrono::microseconds>(
                            current - last).count();
                    for (int i = 0; i < Devices; i++)
                    {
                        if(deviceInfo[i].State == neoRADIO2state_Connected)
                        {
                            memcpy(&last, &current, sizeof(last));
                            result = neoRADIO2ProcessIncomingData(&deviceInfo[i], diff);
                            if (result == 0 && !closed())
                            {
                                if (deviceInfo[i].isOnline == 0)
                                {
                                    neoRADIO2SetOnline(&deviceInfo[i], 1);
                                }
                                std::this_thread::sleep_for(std::chrono::microseconds(1000));
                                if (deviceInfo[i].rxDataCount > 0 && deviceInfo[i].State == neoRADIO2state_Connected)
                                {
                                    returnValueOfData = neoRADIO2returnDataJSON(&deviceInfo[i], &return_measured_data, i);
                                }
                            }
                            else
                            {
                                deviceConnected = false;
                            }
                        }
                    }

                    if(returnValueOfData)
                    {
                        CustomMessage toSend("data_stream", return_measured_data.dump());
                        writeToNode(progress, toSend);
                    }
                }
                    break;

                case SendSettings:
                {
                    if(result == 0)
                    {
                        try
                        {
                            json settingsData = json::parse(messageData);
                            int usbIndex = settingsData["usbIndex"].get<unsigned int>();
                            if(usbIndex < 1 || usbIndex > 8)
                            {
                                usbIndex = 0;
                            }

                            int returnValue = neoRADIO2SetSettingsFromJSON(&deviceInfo[usbIndex], &messageData);

                            CustomMessage toSend("settings_reply_count", std::to_string(returnValue));
                            writeToNode(progress, toSend);

                            if(returnValue == -1)
                            {
                                CustomMessage sendError("error_msg", "200");
                                writeToNode(progress, sendError);
                                neoRADIO2_state = DeviceIdle;
                            }
                            else
                            {
                                neoRADIO2_state = DeviceReload;
                            }
                        }
                        catch(const std::exception& e)
                        {
                            std::cout << "Caught exception " << e.what() << std::endl;
                            deviceConnected = false;
                        }
                    }
                }
                    break;

                case DeviceReload:
                {
                    json reload;
                    if (result == 0 && !closed())
                    {
                        for (int i = 0; i < Devices; i++)
                        {
                            neoRADIO2RequestSettings(&deviceInfo[i]);
                            int timeout = 1000;
                            while(deviceInfo[i].State != neoRADIO2state_Connected && timeout > 0)
                            {
                                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                                neoRADIO2ProcessIncomingData(&deviceInfo[i], 1000);
                                timeout--;
                            }

                            if (deviceInfo[i].State == neoRADIO2state_Connected)
                            {
                                reload["usb" + std::to_string(i)] = neoRADIO2returnChainlistJSON(&deviceInfo[i]);
                            }
                        }
                        CustomMessage toSend("settings_reply", reload.dump());
                        writeToNode(progress, toSend);
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case CalReadSettings:
                {
                    if(result == 0)
                    {
                        try
                        {
                            json devices;
                            json settingsData = json::parse(messageData);
                            int usbIndex = settingsData["usbIndex"].get<unsigned int>();
                            if(usbIndex < 1 || usbIndex > 8)
                            {
                                usbIndex = 0;
                            }

                            if(Devices > 0)
                            {
                                devices = neoRADIO2returnAllCalibrationJSON(&deviceInfo[usbIndex], &messageData);
                            }
                            CustomMessage toSend("cal_read", devices.dump());
                            writeToNode(progress, toSend);
                        }
                        catch(const std::exception& e)
                        {
                            std::cout << "Caught exception " << e.what() << std::endl;
                            deviceConnected = false;
                        }
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case CalSendSettings:
                {
                    if(result == 0)
                    {
                        json settingsData = json::parse(messageData);
                        int usbIndex = settingsData["usbIndex"].get<unsigned int>();
                        if(usbIndex < 1 || usbIndex > 8)
                        {
                            usbIndex = 0;
                        }

                        int returnValue = 0;
                        uint8_t deviceType = settingsData["type"].get<unsigned int>();
                        if(deviceType == NEORADIO2_DEVTYPE_AOUT)
                        {
                            returnValue = neoRADIO2SetCalibrationFromJSONAOut(&deviceInfo[usbIndex], &messageData);
                        }
                        else
                        {
                            returnValue = neoRADIO2SetCalibrationFromJSON(&deviceInfo[usbIndex], &messageData);
                        }

                        if(returnValue >= 0)
                        {
                            switch (deviceType)
                            {
                                case NEORADIO2_DEVTYPE_AIN:
                                    if(returnValue < 5)
                                    {
                                        CustomMessage toSend("cal_settings", std::to_string(returnValue));
                                        writeToNode(progress, toSend);
                                    }
                                    else
                                    {
                                        CustomMessage toSend("cal_settings", "OK");
                                        writeToNode(progress, toSend);
                                    }
                                    break;
                                case NEORADIO2_DEVTYPE_AOUT:
                                    if(returnValue < 7)
                                    {
                                        CustomMessage toSend("cal_settings", std::to_string(returnValue + 10));
                                        writeToNode(progress, toSend);
                                    }
                                    else
                                    {
                                        CustomMessage toSend("cal_settings", "OK");
                                        writeToNode(progress, toSend);
                                    }
                                    break;
                                default:
                                    CustomMessage toSend("cal_settings", "OK");
                                    writeToNode(progress, toSend);
                                    break;
                            }
                        }
                        else
                        {
                            CustomMessage sendError("error_msg", "300");
                            writeToNode(progress, sendError);
                        }
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case CalInteractive:
                {
                    json sample;
                    if (result == 0 && !closed())
                    {
                        json settingsData = json::parse(messageData);
                        int usbIndex = settingsData["usbIndex"].get<unsigned int>();
                        if(usbIndex < 1 || usbIndex > 8)
                        {
                            usbIndex = 0;
                        }

                        auto current = std::chrono::steady_clock::now();
                        auto diff = std::chrono::duration_cast<std::chrono::microseconds>(
                                current - last).count();
                        memcpy(&last, &current, sizeof(last));
                        neoRADIO2ProcessIncomingData(deviceInfo, diff);
                        if(neoRADIO2returnCalibrationDataJSON(&deviceInfo[usbIndex], &sample, &messageData))
                        {
                            std::this_thread::sleep_for(std::chrono::milliseconds(1));
                            CustomMessage toSend("cal_inter", sample.dump());
                            writeToNode(progress, toSend);
                        }
                        else
                        {
                            CustomMessage toSend("cal_inter", "error");
                            writeToNode(progress, toSend);
                            neoRADIO2_state = DeviceIdle;
                        }
                    }
                }
                    break;

                case ClearCal:
                {
                    if(result == 0)
                    {
                        json settingsData = json::parse(messageData);
                        int usbIndex = settingsData["usbIndex"].get<unsigned int>();
                        if(usbIndex < 1 || usbIndex > 8)
                        {
                            usbIndex = 0;
                        }

                        neoRADIO2ClearCalibration(&deviceInfo[usbIndex], &messageData);
                        CustomMessage toSend("cal_clear", "done");
                        writeToNode(progress, toSend);
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case SetPwrRly:
                {
                    if(result == 0)
                    {
                        json settingsData = json::parse(messageData);
                        int usbIndex = settingsData["usbIndex"].get<unsigned int>();
                        if(usbIndex < 1 || usbIndex > 8)
                        {
                            usbIndex = 0;
                        }

                        neoRADIO2SetPwrRly(&deviceInfo[usbIndex], &messageData);
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case SetAout:
                {
                    //TODO:: test
                    if(result == 0)
                    {
                        json settingsData = json::parse(messageData);
                        int usbIndex = settingsData["usbIndex"].get<unsigned int>();
                        if(usbIndex < 1 || usbIndex > 8)
                        {
                            usbIndex = 0;
                        }

                        neoRADIO2SetAoutValue(&deviceInfo[usbIndex], &messageData);
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case SetDIN:
                {
                    if(result == 0)
                    {
                        try
                        {
                            json settingsData = json::parse(messageData);
                            int usbIndex = settingsData["usbIndex"].get<unsigned int>();
                            if(usbIndex < 1 || usbIndex > 8)
                            {
                                usbIndex = 0;
                            }

                            int returnValue = RADIO2SetDINValue(&deviceInfo[usbIndex], &messageData);
                            if(returnValue == 2)
                            {
                                neoRADIO2_state = DeviceOnline;
                            }
                            else if(returnValue == 1)
                            {
                                neoRADIO2_state = DeviceIdle;
                            }
                            else
                            {
                                CustomMessage sendError("error_msg", "410");
                                writeToNode(progress, sendError);
                                neoRADIO2_state = DeviceIdle;
                            }

                        }
                        catch(const std::exception& e)
                        {
                            std::cout << "Caught exception " << e.what() << std::endl;
                            deviceConnected = false;
                        }
                    }
                }
                    break;

                case SetDOUT:
                {
                    if(result == 0)
                    {
                        try
                        {
                            json settingsData = json::parse(messageData);
                            int usbIndex = settingsData["usbIndex"].get<unsigned int>();
                            if(usbIndex < 1 || usbIndex > 8)
                            {
                                usbIndex = 0;
                            }

                            int returnValue = RADIO2SetDOUTValue(&deviceInfo[usbIndex], &messageData);
                            if(returnValue == 2)
                            {
                                CustomMessage sendError("error_msg", "401");
                                writeToNode(progress, sendError);
                                neoRADIO2_state = DeviceOnline;
                            }
                            else if(returnValue == 1)
                            {
                                CustomMessage sendError("error_msg", "401");
                                writeToNode(progress, sendError);
                                neoRADIO2_state = DeviceIdle;
                            }
                            else
                            {
                                CustomMessage sendError("error_msg", "400");
                                writeToNode(progress, sendError);
                                neoRADIO2_state = DeviceIdle;
                            }

                        }
                        catch(const std::exception& e)
                        {
                            std::cout << "Caught exception " << e.what() << std::endl;
                            deviceConnected = false;
                        }
                    }
                }
                    break;

                case LoadDefault:
                {
                    if(result == 0)
                    {
                        json reload;
                        json settingsData = json::parse(messageData);
                        int usbIndex = settingsData["usbIndex"].get<unsigned int>();
                        std::string rtData;
                        if(usbIndex < 1 || usbIndex > 8)
                        {
                            usbIndex = 0;
                        }

                        if(neoRADIO2DefaultSettings(&deviceInfo[usbIndex], &messageData) == 1)
                        {
                            neoRADIO2RequestSettings(&deviceInfo[usbIndex]);
                            int timeout = 1000;
                            while(deviceInfo[usbIndex].State != neoRADIO2state_Connected && timeout > 0)
                            {
                                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                                neoRADIO2ProcessIncomingData(&deviceInfo[usbIndex], 1000);
                                timeout--;
                            }

                            if (deviceInfo[usbIndex].State == neoRADIO2state_Connected)
                            {
                                reload["usb" + std::to_string(usbIndex)] = neoRADIO2returnChainlistJSON(&deviceInfo[usbIndex]);
                            }

                            rtData = "OK";
                            CustomMessage toSend("settings_reply", reload.dump());
                            writeToNode(progress, toSend);
                        }
                        else
                        {
                            rtData = "FAIL";
                        }
                        CustomMessage toSend("default_loaded", rtData);
                        writeToNode(progress, toSend);
                        neoRADIO2_state = DeviceIdle;
                    }
                    else
                    {
                        neoRADIO2_state = DeviceIdle;
                    }
                }
                    break;

                default:
                    break;
            }

            if(closed())
            {
                deviceConnected = false;
            }
        }

        for (int i = 0; i < Devices; i++)
        {
            neoRADIO2CloseDevice(&deviceInfo[i]);
        }
        CustomMessage toSend("killall", "");
        writeToNode(progress, toSend);
    }
};

class StreamWorkerWrapper : public Nan::ObjectWrap
{
    public:
        static NAN_MODULE_INIT(Init)
            {
                v8::Local < v8::FunctionTemplate > tpl = Nan::New<v8::FunctionTemplate>(New);
                tpl->SetClassName(Nan::New("DataWorker").ToLocalChecked());
                tpl->InstanceTemplate()->SetInternalFieldCount(2);

                SetPrototypeMethod(tpl, "sendToAddon", sendToAddon);
                SetPrototypeMethod(tpl, "closeInput", closeInput);

                constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
                Nan::Set(target, Nan::New("DataWorker").ToLocalChecked(),
                Nan::GetFunction(tpl).ToLocalChecked());
            }

    private:
        explicit StreamWorkerWrapper(DataWorker *worker) : _worker(worker) {}

    ~StreamWorkerWrapper() {}

    static NAN_METHOD(New)
        {
            if (info.IsConstructCall())
            {
                Nan::Callback *data_callback = new Nan::Callback(info[0].As<v8::Function>());
                Nan::Callback *complete_callback = new Nan::Callback(info[1].As<v8::Function>());

                StreamWorkerWrapper *obj = new StreamWorkerWrapper(create_worker(data_callback,complete_callback));

                obj->Wrap(info.This());
                info.GetReturnValue().Set(info.This());

                // start the worker
                Nan::AsyncQueueWorker(obj->_worker);
            }
        }

    static NAN_METHOD(sendToAddon)
        {
            v8::String::Utf8Value name(info[0]->ToString());
            v8::String::Utf8Value data(info[1]->ToString());
            StreamWorkerWrapper *obj = Nan::ObjectWrap::Unwrap<StreamWorkerWrapper>(info.Holder());
            obj->_worker->fromNode.write(CustomMessage(*name, *data));
        }

    static NAN_METHOD(closeInput)
        {
            StreamWorkerWrapper *obj = Nan::ObjectWrap::Unwrap<StreamWorkerWrapper>(info.Holder());
            obj->_worker->close();
        }

    static inline Nan::Persistent <v8::Function> &constructor()
    {
        static Nan::Persistent <v8::Function> my_constructor;
        return my_constructor;
    }

    DataWorker *_worker;
};

DataWorker *create_worker(Nan::Callback *data, Nan::Callback *complete)
{
    return new Sensor(data, complete);
}

NODE_MODULE(neoRAD_IO2, StreamWorkerWrapper::Init)