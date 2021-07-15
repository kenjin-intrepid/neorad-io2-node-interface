window.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
};

const electron = require('electron');
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
window.msvc_path = path.join(__dirname, "msvc", "vc_redist.x64.exe");

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

window.mypath = mypath;