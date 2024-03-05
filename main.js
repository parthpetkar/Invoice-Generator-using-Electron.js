const electron = require("electron");
const app = electron.app;
const BrowerWindow = electron.BrowserWindow;
const path = require("path");
const url = require("url");

let win;

function createWindow(){
    win = new BrowerWindow();
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true
    }));
    
    //win.webContents.
    win.on('closed', ()=>{
        win = null;
    })
}

app.on('ready', createWindow);

app.on('window-all-closed',()=>{
    if(process.platform!=='darwin'){
        app.quit()
    }
})

app.on('activate',()=>{
    if(win=='null'){
        createWindow()
    }
})