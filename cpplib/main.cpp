//Link with SetupAPI.Lib for windows
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
            SetAout = 10
        };
        std::string device = "device";
        std::string channel = "channel";
        std::string concatenateI, concatenateJ, messageData;
        int messageName;
        bool deviceConnected = true;
        int neoRADIO2_state = DeviceIdle;
        int result, Devices;
        neoRADIO2_USBDevice deviceLinked[8];
        neoRADIO2_DeviceInfo deviceInfo;
        auto last = std::chrono::steady_clock::now();
        auto current = std::chrono::steady_clock::now();
        memset(&deviceInfo, 0 ,sizeof(deviceInfo));

        while (deviceConnected)
        {
            if(fromNode.haveDataFromNode())
            {
                CusMessage messageFromNode = fromNode.read();
                messageName = std::stoi(messageFromNode.name);
                messageData = messageFromNode.data;
                neoRADIO2_state = messageName;
            }

            switch (neoRADIO2_state)
            {
                case DeviceIdle:
                {
                    CusMessage toSend("idle","idle");
                    writeToNode(progress, toSend);
                    int resultStat;
                    if(Devices > 0)
                    {
                        if(result == 0)
                        {
                            current = std::chrono::steady_clock::now();
                            auto diff = std::chrono::duration_cast<std::chrono::microseconds>(current - last).count();
                            memcpy(&last, &current, sizeof(last));
                            resultStat = neoRADIO2ProcessIncomingData(&deviceInfo, 1000);
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
                    Devices = neoRADIO2FindDevices(deviceLinked, 8);
                    std::this_thread::sleep_for(std::chrono::milliseconds(1000));
                    json devices;
                    if(Devices > 0)
                    {
                        for (int i = 0; i < Devices; i++)
                        {
                            memset(&deviceInfo, 0, sizeof(deviceInfo));
                            memcpy(&deviceInfo.usbDevice, &deviceLinked[i], sizeof(neoRADIO2_USBDevice));
                            result = neoRADIO2ConnectDevice(&deviceInfo);
                            unsigned int timeout = 1000;
                            while(deviceInfo.State != neoRADIO2state_Connected && timeout-- > 0)
                            {
                                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                                result = neoRADIO2ProcessIncomingData(&deviceInfo, 1000);
                            }
                            unsigned int timeout2 = 1000;
                            neoRADIO2RequestSettings(&deviceInfo);
                            while(deviceInfo.State != neoRADIO2state_Connected && timeout2-- > 0)
                            {
                                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                                result = neoRADIO2ProcessIncomingData(&deviceInfo, 1000);
                            }
                            devices = neoRADIO2returnChainlistJSON(&deviceInfo);
                            CusMessage toSend("device_found", devices.dump());
                            writeToNode(progress, toSend);
                        }
                        neoRADIO2_state = DeviceIdle;
                    }
                    else
                    {
                        CusMessage toSend("device_found", "device_FAILED_TO_CONNECT");
                        writeToNode(progress, toSend);
                        neoRADIO2_state = DeviceIdle;
                    }
                }
                    break;

                case DeviceOnline:
                {
                    int timeout = 0;
                    json sample;
                    while (result == 0 && !closed())
                    {
                        if(paused() == 0)
                        {
                            CusMessage toSend("paused", "paused");
                            writeToNode(progress, toSend);
                            neoRADIO2SetOnline(&deviceInfo, 0);
                            neoRADIO2_state = DeviceIdle;
                            break;
                        }
                        neoRADIO2SetOnline(&deviceInfo, 1);
                        timeout++;
                        std::this_thread::sleep_for(std::chrono::milliseconds(1));
                        result = neoRADIO2ProcessIncomingData(&deviceInfo, 1000);
                        if (deviceInfo.rxDataCount > 0 && deviceInfo.State == neoRADIO2state_Connected)
                        {
                            timeout = 0;
                            neoRADIO2returnDataJSON(&deviceInfo, &sample);
                            CusMessage toSend("data_stream", sample.dump());
                            writeToNode(progress, toSend);
                        }
                        else
                        {
                            if(timeout > 3000)
                            {
                                CusMessage toSend("timeout", "nodata");
                                writeToNode(progress, toSend);
                                std::this_thread::sleep_for(std::chrono::milliseconds(10));
                            }
                        }
                    }

                    if(result == 0)
                    {
                        neoRADIO2_state = DeviceIdle;
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
                        int returnValue = neoRADIO2SetSettingsFromJSON(&deviceInfo, &messageData);
                        neoRADIO2SetSettings(&deviceInfo);
                        unsigned int timeout = 300;
                        while (deviceInfo.State != neoRADIO2state_Connected && timeout-- != 0)
                        {
                            std::this_thread::sleep_for(std::chrono::milliseconds(1));
                            neoRADIO2ProcessIncomingData(&deviceInfo, 1000);
                        }
                        std::this_thread::sleep_for(std::chrono::milliseconds(200));

                        CusMessage toSend("settings_reply_count", std::to_string(returnValue));
                        writeToNode(progress, toSend);

                        if(returnValue == -1)
                        {
                            std::cout << "values missing" << std::endl;
                            CusMessage toSend("settings_reply", "WRITE_FAIL");
                            writeToNode(progress, toSend);
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
                    while (result == 0 && !closed())
                    {
                        std::this_thread::sleep_for(std::chrono::milliseconds(1));
                        result = neoRADIO2ProcessIncomingData(&deviceInfo, 1000);
                        if (deviceInfo.State == neoRADIO2state_Connected)
                        {
                            reload = neoRADIO2returnChainlistJSON(&deviceInfo);
                            CusMessage toSend("settings_reply", reload.dump());
                            writeToNode(progress, toSend);
                            neoRADIO2SetOnline(&deviceInfo, 0);
                            break;
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
                            devices = neoRADIO2returnAllCalibrationJSON(&deviceInfo, &messageData);
                        }
                        CusMessage toSend("cal_read", devices.dump());
                        writeToNode(progress, toSend);
                        neoRADIO2_state = DeviceIdle;
                    }
                }
                    break;

                case CalSendSettings:
                {
                    if(result == 0)
                    {
                        json settingsData = json::parse(messageData);
                        uint8_t deviceType = settingsData["type"].get<unsigned int>();
                        int returnValue = neoRADIO2SetCalibrationFromJSON(&deviceInfo, &messageData);
                        if(returnValue >= 0)
                        {
                            if(deviceType != NEORADIO2_DEVTYPE_AIN)
                            {
                                CusMessage toSend("cal_settings", "OK");
                                writeToNode(progress, toSend);
                            }
                            else
                            {
                                if(returnValue < 5)
                                {
                                    CusMessage toSend("cal_settings", std::to_string(returnValue));
                                    writeToNode(progress, toSend);
                                }
                                else
                                {
                                    CusMessage toSend("cal_settings", "OK");
                                    writeToNode(progress, toSend);
                                }
                            }
                        }
                        else
                        {
                            CusMessage toSend("cal_settings", "NOT OK");
                            writeToNode(progress, toSend);
                        }
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case CalInteractive:
                {
                    json sample;
                    while (result == 0 && !closed())
                    {
                        if(fromNode.haveDataFromNode())
                        {
                            CusMessage messageFromNode = fromNode.read();
                            messageName = std::stoi(messageFromNode.name);
                            messageData = messageFromNode.data;
                            if(messageName != CalInteractive)
                            {
                                neoRADIO2_state = messageName;
                                break;
                            }
                        }

                        neoRADIO2returnCalibrationDataJSON(&deviceInfo, &sample, &messageData);
                        CusMessage toSend("cal_inter", sample.dump());
                        writeToNode(progress, toSend);
                        std::this_thread::sleep_for(std::chrono::milliseconds(1));
                    }
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case ClearCal:
                {
                    neoRADIO2ClearCalibration(&deviceInfo, &messageData);
                    CusMessage toSend("cal_clear", "done");
                    writeToNode(progress, toSend);
                    neoRADIO2_state = DeviceIdle;
                }
                    break;

                case SetPwrRly:
                {
                    if(result == 0)
                    {
                        int returnValue = neoRADIO2SetPwrRly(&deviceInfo, &messageData);
                        neoRADIO2_state = DeviceIdle;
                    }
                }
                    break;

                case SetAout:
                {
                    if(result == 0)
                    {
                        neoRADIO2SetAoutValue(&deviceInfo, &messageData);
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

        neoRADIO2CloseDevice(&deviceInfo);
        CusMessage toSend("killall", "");
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
                SetPrototypeMethod(tpl, "pauseInput", pauseInput);
                SetPrototypeMethod(tpl, "restartInput", restartInput);

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
            obj->_worker->fromNode.write(CusMessage(*name, *data));
        }

    static NAN_METHOD(closeInput)
        {
            StreamWorkerWrapper *obj = Nan::ObjectWrap::Unwrap<StreamWorkerWrapper>(info.Holder());
            obj->_worker->close();
        }

    static NAN_METHOD(pauseInput)
        {
            StreamWorkerWrapper *obj = Nan::ObjectWrap::Unwrap<StreamWorkerWrapper>(info.Holder());
            obj->_worker->pause();
        }

    static NAN_METHOD(restartInput)
        {
            StreamWorkerWrapper *obj = Nan::ObjectWrap::Unwrap<StreamWorkerWrapper>(info.Holder());
            obj->_worker->restart();
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

NODE_MODULE(RAD_IO2, StreamWorkerWrapper::Init)