#include "neoRAD-IO2_PacketHandler.h"
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
        Sensor(Nan::Callback *data, Nan::Callback *complete, Nan::Callback *error_callback) : DataWorker(data, complete, error_callback){}

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
            SetDOUT = 12
        };
        std::string messageData;
        int messageName, result, Devices, retry = 0, neoRADIO2_state = DeviceIdle;
        bool deviceConnected = true;
        json return_measured_data;
        neoRADIO2_USBDevice deviceLinked[8];
        neoRADIO2_DeviceInfo deviceInfo[8];
        auto last = std::chrono::steady_clock::now();
        auto current = std::chrono::steady_clock::now();
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
                    CustomMessage toSend("idle","idle");
                    writeToNode(progress, toSend);
                    int resultStat;
                    if(Devices > 0)
                    {
                        if(result == 0)
                        {
                            current = std::chrono::steady_clock::now();
                            auto diff = std::chrono::duration_cast<std::chrono::microseconds>(current - last).count();
                            memcpy(&last, &current, sizeof(last));
                            neoRADIO2SetOnline(&deviceInfo[0], 0);
                            resultStat = neoRADIO2ProcessIncomingData(&deviceInfo[0], 1000);
                            if(resultStat != 0)
                            {
                                deviceConnected = false;
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
                        for (int i = 0; i < Devices; i++)
                        {
                            memset(&deviceInfo, 0, sizeof(deviceInfo));
                            memcpy(&deviceInfo[i].usbDevice, &deviceLinked[i], sizeof(neoRADIO2_USBDevice));
                            result = neoRADIO2ConnectDevice(&deviceInfo[i]);
                            unsigned int timeout = 1000;
                            while(deviceInfo[i].State != neoRADIO2state_Connected && timeout > 0)
                            {
                                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                                result = neoRADIO2ProcessIncomingData(&deviceInfo[i], 1000);
                                timeout--;
                            }
                            if(deviceInfo[i].State != neoRADIO2state_Connected && timeout == 0)
                            {
                                deviceConnected = false;
                                if(deviceInfo[i].State == neoRADIO2state_ConnectedWaitIdentResponse)
                                {
//                                    CustomMessage sendError("error_msg", "102");
//                                    writeToNode(progress, sendError);
                                }
                                else
                                {
//                                    CustomMessage sendError("error_msg", "103");
//                                    writeToNode(progress, sendError);
                                }
                                break;
                            }
                            unsigned int timeout2 = 1000;
                            neoRADIO2RequestSettings(&deviceInfo[i]);
                            while(deviceInfo[i].State != neoRADIO2state_Connected && timeout2 > 0)
                            {
                                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                                result = neoRADIO2ProcessIncomingData(&deviceInfo[i], 1000);
                                timeout2--;
                            }

                            if(deviceInfo[i].State != neoRADIO2state_Connected && timeout2 == 0)
                            {
                                deviceConnected = false;
                                if(deviceInfo[i].State == neoRADIO2state_ConnectedWaitIdentResponse)
                                {
//                                    CustomMessage sendError("error_msg", "102");
//                                    writeToNode(progress, sendError);
                                }
                                else
                                {
//                                    CustomMessage sendError("error_msg", "103");
//                                    writeToNode(progress, sendError);
                                }
                                break;
                            }
                            devices["usb" + std::to_string(i)] = neoRADIO2returnChainlistJSON(&deviceInfo[i]);
                        }
                        CustomMessage SendFound("device_found", devices.dump());
                        writeToNode(progress, SendFound);
                        neoRADIO2_state = DeviceIdle;
                        retry = 0;
                    }
                    else
                    {
                        if(retry > 1000)
                        {
                            deviceConnected = false;
                            CustomMessage sendError("error_msg", "101");
                            writeToNode(progress, sendError);
                            neoRADIO2_state = DeviceIdle;
                        }
                        else
                        {
                            neoRADIO2_state = DeviceInit;
                            retry++;
                        }
                    }
                }
                    break;

                case DeviceOnline:
                {
                    if (result == 0 && !closed())
                    {
                        if(deviceInfo[0].isOnline == 0)
                        {
                            neoRADIO2SetOnline(&deviceInfo[0], 1);
                        }
                        result = neoRADIO2ProcessIncomingData(&deviceInfo[0], 1000);
                        std::this_thread::sleep_for(std::chrono::milliseconds(1));
                        if (deviceInfo[0].rxDataCount > 0 && deviceInfo[0].State == neoRADIO2state_Connected)
                        {
                            neoRADIO2returnDataJSON(&deviceInfo[0], &return_measured_data);
                            CustomMessage toSend("data_stream", return_measured_data.dump());
                            writeToNode(progress, toSend);
                        }
                    }
                    else
                    {
                        deviceConnected = false;
                    }
                }
                    break;

                case SendSettings:
                {
                    if(result == 0)
                    {
                        int returnValue = neoRADIO2SetSettingsFromJSON(&deviceInfo[0], &messageData);
                        neoRADIO2SetSettings(&deviceInfo[0]);
                        unsigned int timeout = 300;
                        while (deviceInfo[0].State != neoRADIO2state_Connected && timeout-- != 0)
                        {
                            std::this_thread::sleep_for(std::chrono::milliseconds(1));
                            neoRADIO2ProcessIncomingData(&deviceInfo[0], 1000);
                        }
                        std::this_thread::sleep_for(std::chrono::milliseconds(200));

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
                }
                    break;

                case DeviceReload:
                {
                    json reload;
                    if (result == 0 && !closed())
                    {
                        result = neoRADIO2ProcessIncomingData(&deviceInfo[0], 1000);
                        std::this_thread::sleep_for(std::chrono::milliseconds(100));
                        if (deviceInfo[0].State == neoRADIO2state_Connected)
                        {
                            reload = neoRADIO2returnChainlistJSON(&deviceInfo[0]);
                            CustomMessage toSend("settings_reply", reload.dump());
                            writeToNode(progress, toSend);
                        }
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case CalReadSettings:
                {
                    if(result == 0)
                    {
                        Devices = neoRADIO2FindDevices(deviceLinked, 8);
                        json devices;
                        if(Devices > 0)
                        {
                            devices = neoRADIO2returnAllCalibrationJSON(&deviceInfo[0], &messageData);
                        }
                        CustomMessage toSend("cal_read", devices.dump());
                        writeToNode(progress, toSend);
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case CalSendSettings:
                {
                    if(result == 0)
                    {
                        json settingsData = json::parse(messageData);
                        int returnValue = 0;
                        uint8_t deviceType = settingsData["type"].get<unsigned int>();
                        if(deviceType == NEORADIO2_DEVTYPE_AOUT)
                        {
                            returnValue = neoRADIO2SetCalibrationFromJSONAOut(&deviceInfo[0], &messageData);
                        }
                        else
                        {
                            returnValue = neoRADIO2SetCalibrationFromJSON(&deviceInfo[0], &messageData);
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
                        if(neoRADIO2returnCalibrationDataJSON(&deviceInfo[0], &sample, &messageData) == 0)
                        {
                            std::this_thread::sleep_for(std::chrono::milliseconds(1));
                            CustomMessage toSend("cal_inter", sample.dump());
                            writeToNode(progress, toSend);
                        }
                    }
                }
                    break;

                case ClearCal:
                {
                    if(result == 0)
                    {
                        neoRADIO2ClearCalibration(&deviceInfo[0], &messageData);
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
                        int returnValue = neoRADIO2SetPwrRly(&deviceInfo[0], &messageData);
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case SetAout:
                {
                    if(result == 0)
                    {
                        neoRADIO2SetAoutValue(&deviceInfo[0], &messageData);
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case SetDIN:
                {

                }
                    break;

                case SetDOUT:
                {

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

        neoRADIO2CloseDevice(&deviceInfo[0]);
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
                Nan::Callback *error_callback = new Nan::Callback(info[2].As<v8::Function>());

                StreamWorkerWrapper *obj = new StreamWorkerWrapper(create_worker(data_callback,complete_callback,error_callback));

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

DataWorker *create_worker(Nan::Callback *data, Nan::Callback *complete, Nan::Callback *error_callback)
{
    return new Sensor(data, complete, error_callback);
}

NODE_MODULE(neoRAD_IO2, StreamWorkerWrapper::Init)