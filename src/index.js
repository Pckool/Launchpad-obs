import { app, BrowserWindow, ipcMain, dialog, Tray } from 'electron';
var path = require('path');

const appIcon = path.join(__dirname, '/media/images/lp-obs.ico');

const easymidi = require('easymidi');
var input, output;
const opn = require('opn');
const OBSWebSocket = require('obs-websocket-js');

const obs = new OBSWebSocket();

// Launchpad Ref Manual:  https://media.discopiu.com/files/2015/7/7/246663-original.pdf
// OBS Websocket Docs: https://github.com/Palakis/obs-websocket/blob/4.x-current/docs/generated/protocol.md

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 280,
        height: 600,
        minWidth: 280,
        icon: appIcon
    });

    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/index.html`);

    // Open the DevTools.
    //mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    findingInputs();
    findingOutputs();
};
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    input.close();
    disconnectOBS();
    output.close();

});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});



function connectToOBS(event={}, ws_data={}) {
    obs.connect({ address: `localhost:${ws_data.port || 4444}`, password: `${ws_data.password || 'password'}` })
    .then( () => {
        setButtonColors();
        setOnNotes();
        // obsConnected();
        console.log("Connected to users OBS.");
        if(event) event.sender.send('OBS-conn');
    })
    .catch((err) => {
        console.log(err);
        if(err.code === 'CONNECTION_ERROR'){
            dialog.showMessageBox({
                type: "info",
                title: "OBS Websocket Issue",
                message: "There is an issue with your OBS Websocket.\n You either don't have it installed, don't have it activated, or OBS isn't open.",
                buttons: ["Okay", "Download OBS Websocket"],

            }, (res) => {
                if(res === 1){
                    opn('https://obsproject.com/forum/resources/obs-websocket-remote-control-of-obs-studio-made-easy.466/');
                }
            });
        }

    });
}
ipcMain.on('start-OBS', connectToOBS);

function disconnectOBS(){
    blankColors();
    obs.disconnect();
}

function findingInputs() {
    let inputs = easymidi.getInputs();
    try{
        for(var i in inputs){
            if(inputs[i].includes('Launchpad MK2')){
                input = new easymidi.Input(inputs[i]);
            }
        }
    }
    catch(err){
        console.log('Error: ' + err);
    }
}

function findingOutputs() {
    let outputs = easymidi.getOutputs();
    try{
        for(var i in outputs){
            if(outputs[i].includes('Launchpad MK2')){
                output = new easymidi.Output(outputs[i]);
            }
        }
    }
    catch(err){
        console.log('Error: ' + err);
    }
}

function setButtonColors() {
    obs.send('GetSceneList')
    .then( (sceneList) => {
        if(sceneList.scenes.length <= 8){
            let maxNote = parseInt(`${sceneList.scenes.length}9`);
            let offsetNote = 89 - maxNote + 9;
            let i = 0;
            for(var pos = 89; pos > offsetNote; pos -= 10){
                if(sceneList.scenes[i].name && sceneList['current-scene'] === sceneList.scenes[i].name){
                    output.send('noteon', {
                        channel: 0,
                        velocity: 3,
                        note: pos
                    });
                    console.log('Changing active color (white)');
                }
                else
                    output.send('noteon', {
                        channel: 0,
                        velocity: 120,
                        note: pos
                    });
                i++;
            }

        }
    })
    .catch((err) => {
        console.error(err);
    });
    toggleStreamingButton();
}
function blankColors(){
    output.send('sysex',[240, 0, 32, 41, 2, 24, 14, 0, 247]);
}

function getScenes(event={}){
    obs.send('GetSceneList')
    .then( (sceneList) => {
        //console.log(sceneList);
        if(event) event.sender.send('sceneList', sceneList);
        else return sceneList;
    })
    .catch( (err) => {
        console.log(err);
    });
}
ipcMain.on('get-scenes', getScenes);

function getStats(event={}){
    obs.on('StreamStatus', function(statsList) {
        console.log(statsList);
        if(event) event.sender.send('statsList', statsList);
    })
}
ipcMain.on('get-stats', getStats);


function setOnNotes() {
    input.on('noteon', function(params) {
        // OBS Scene Buttons
        if(params.note === 89 || params.note === 79 || params.note === 69 || params.note === 59 || params.note === 49 || params.note === 39 || params.note === 29 || params.note === 19){
            obs.send('GetSceneList')
            .then((sceneList) => {
                console.log(params);
                // If we only have one page of scenes
                if(sceneList.scenes.length <= 8){
                    let maxNote = parseInt(`${sceneList.scenes.length}9`);
                    let offsetNote = 89 - maxNote + 9;
                    let i = 0;
                    for(var pos = 89; pos > offsetNote; pos -= 10){
                        if(params.note === pos && params.velocity > 0) {

                            obs.send('SetCurrentScene', { "scene-name": sceneList.scenes[i].name })
                            .then(() => {
                                setButtonColors();
                            })
                            .catch( (err) => {
                                console.log(err);
                            });
                            break;
                        }
                        i++;
                    }
                }
            })
            .catch((err) => {
                console.log('There was an error retrieving the list of scenes. please report this error: ' + err);
            });
        }


        // For the Start/Stop Button
        if(params.note === 81){
            obs.send('GetStreamingStatus')
            .then( (data) => {
                if(data.streaming === true){
                    obs.send('StopStreaming')
                    .then( () => {
                    })
                    .catch((err) => {
                        console.log(err);
                    });
                }
                else{
                    obs.send('StartStreaming')
                    .then( () => {
                    })
                    .catch((err) => {
                        console.log(err);
                    });
                }
            })
            .catch( (err) => {
                console.log(err);
            })
        }
    });
}

function toggleStreamingButton(){
    obs.send('GetStreamingStatus')
    .then( (data) => {
        if(data.streaming === true){
            output.send('noteon', {
                channel: 0,
                note: 81,
                velocity: 120
            });
        }
        else{
            output.send('noteon', {
                channel: 0,
                note: 81,
                velocity: 122
            });
        }
    })
}
obs.on('StreamStarted', toggleStreamingButton);
obs.on('StreamStopped', toggleStreamingButton);

obs.on('Exiting', () =>{
    console.log('OBS Is Exiting...');
    disconnectOBS();
});

obs.on('error', err =>{
    console.error(err);
});
