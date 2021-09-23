window.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
};

const electron = require('electron');
const crypto = require("crypto");
const {spawn: Child_ProcessSpawn} = require("child_process");
const {ipcRenderer} = electron;
window.ipcRenderer = ipcRenderer;
window.dialog = electron.remote.dialog;
window.Shell = electron.shell;
window.settings = electron.remote.require('electron-settings');
window.systemLan = ipcRenderer.sendSync('get-locale', 'get-locale');
window.$ = window.jQuery = require('jquery');
window.fs = require('fs');
window.Papa = require('papaparse');
window.path = require('path');
window.isDev = require('electron-is-dev');
window.Child_Process = require('child_process').execFile;
window.msvc_path = path.join(__dirname, "updater", "vc_redist.x64.exe");
const firmware_updater = path.join(__dirname, "updater", "updater318.exe");

const mypath = ipcRenderer.sendSync('get-path', 'get-path');

if(!fs.existsSync(`${mypath}\/IntrepidCS\/RAD-IO2\/PlotHistory`))
{
    if(!fs.existsSync(`${mypath}\/IntrepidCS\/RAD-IO2`))
    {
        if(!fs.existsSync(`${mypath}\/IntrepidCS`))
        {
            fs.mkdir(`${mypath}\/IntrepidCS`,function (err) {
                console.log(err);
                fs.mkdir(`${mypath}\/IntrepidCS\/RAD-IO2`,function (err) {
                    console.log(err);
                    fs.mkdir(`${mypath}\/IntrepidCS\/RAD-IO2\/PlotHistory`,function (err) {
                        console.log(err);
                    });
                });
            });
        }

        fs.mkdir(`${mypath}\/IntrepidCS\/RAD-IO2`,function (err) {
            console.log(err);
            fs.mkdir(`${mypath}\/IntrepidCS\/RAD-IO2\/PlotHistory`,function (err) {
                console.log(err);
            });
        });
    }

    fs.mkdir(`${mypath}\/IntrepidCS\/RAD-IO2\/PlotHistory`,function (err) {
        console.log(err);
    });
}

ipcRenderer.on('update_firmware', function() {
    if(!fs.existsSync(`${mypath}\/IntrepidCS\/RAD-IO2\/updater318.exe`)){
        fs.copyFile( firmware_updater, `${mypath}\/IntrepidCS\/RAD-IO2\/updater318.exe`, function (){
            Child_ProcessSpawn(`${mypath}\/IntrepidCS\/RAD-IO2\/updater318.exe`,{
                shell: true,
                detached: true
            });
        });
    }
    else
    {
        let shasum = crypto.createHash('md5');
        let stream = fs.ReadStream(`${mypath}\/IntrepidCS\/RAD-IO2\/updater318.exe`);
        stream.on('data', function(data) {
            shasum.update(data);
        });
        stream.on('end', function() {
            let d = shasum.digest('hex');
            if(d !== "cbfec33b67cc76a75c9823632d65d28d")
            {
                fs.copyFile( firmware_updater, `${mypath}\/IntrepidCS\/RAD-IO2\/updater318.exe`, function (){
                    Child_ProcessSpawn(`${mypath}\/IntrepidCS\/RAD-IO2\/updater318.exe`,{
                        shell: true,
                        detached: true
                    });
                });
            }
            else
            {
                Child_ProcessSpawn(`${mypath}\/IntrepidCS\/RAD-IO2\/updater318.exe`,{
                    shell: true,
                    detached: true
                });
            }
        });
    }
});

window.mypath = mypath;