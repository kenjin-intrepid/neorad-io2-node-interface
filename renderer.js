window.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
};

const electron = require('electron');
const {ipcRenderer, crashReporter} = electron;
const settings = require('electron-settings');

window.app = require('electron').remote;
window.dialog = app.dialog;
window.fs = require('fs');

window.systemLan = ipcRenderer.sendSync('get-locale', 'get-locale');

window.$ = window.jQuery = require('jquery');
window.Papa = require('papaparse');
window.Shell = require('electron').shell;
window.settings = require('electron').remote.require('electron-settings');
window.path = require('path');
window.ipcRenderer = ipcRenderer;
window.isFahrenheit = 0;
window.refreshRate = 100;

const mypath = ipcRenderer.sendSync('get-path', 'get-path');
if(!fs.existsSync(`${mypath}\/IntrepidCS`))
{
    fs.mkdir(`${mypath}\/IntrepidCS`,function (err) {
        console.log(err);
    });
}

if(!fs.existsSync(`${mypath}\/IntrepidCS\/RAD-IO2`))
{
    fs.mkdir(`${mypath}\/IntrepidCS\/RAD-IO2`,function (err) {
        console.log(err);
    });
}

if(!fs.existsSync(`${mypath}\/IntrepidCS\/RAD-IO2\/PlotHistory`))
{
    fs.mkdir(`${mypath}\/IntrepidCS\/RAD-IO2\/PlotHistory`,function (err) {
        console.log(err);
    });
}

window.mypath = mypath;

const Addon = require("bindings")("RAD_IO2");
if(Addon)
{
    window.Addon = Addon;
}

// crash report
let upload = false;
if(settings.get('crash') && settings.get('crash') == "true")
{
    upload = true;
}
crashReporter.start({
    productName: "Electron",
    companyName: "gdinod",
    submitURL: "https://submit.backtrace.io/gdinod/193e5505e1c918a555bfd6ce330ad1478b8fedde652392499efe2057e0d40e8d/minidump",
    uploadToServer: upload
});
// crash report end