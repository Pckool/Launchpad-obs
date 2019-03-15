import { app, BrowserWindow, ipcMain } from 'electron';
const easymidi = require('easymidi');
var input, output, outputChannel;

const OBSWebSocket = require('obs-websocket-js');

const obs = new OBSWebSocket();

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
        width: 800,
        height: 600,
    });

    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/index.html`);

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

function connectToOBS(event={}, ws_data={}) {
    obs.connect({ address: `localhost:${ws_data.port || 4444}`, password: `${ws_data.password || 'password'}` })
    .then( () => {
        setButtonColors();
        setOnNotes();
        console.log("Connected to users OBS.");
        if(event) event.sender.send('OBS-conn');
    })
    .catch((err) => {
        console.log("OBS Websocket not started. Please start manually.");
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
                outputChannel = i;
            }
        }
    }
    catch(err){
        console.log('Error: ' + err);
    }
}

function setButtonColors() {
    let i = 89;
    console.log(`Outputchannel: ${outputChannel}`);
    while(i >= 19){
        output.send('noteon', {
            channel: 0,
            velocity: 120,
            note: i
        });
        i = i-10;
    }
}
function blankColors(){
    output.send('sysex',[240, 0, 32, 41, 2, 24, 14, 0, 247]);
}

function getScenes(event={}){
    obs.send('GetSceneList')
    .then( (sceneList) => {
        console.log(sceneList);
        if(event) event.sender.send('sceneList', sceneList);
    })
    .catch( (err) => {
        console.log(err);
    });
}
ipcMain.on('get-scenes', getScenes);



function setOnNotes() {
    input.on('noteon', function(params) {
        obs.send('GetSceneList')
        .then((sceneList) => {
            console.log(params);
            if(params.note === 89 && params.velocity > 0) {
                obs.send('SetCurrentScene', { "scene-name": sceneList.scenes[0].name })
                .catch( (err) => {
                    console.log(err);
                });
            }
            else if(params.note === 79 && params.velocity > 0) {
                obs.send('SetCurrentScene', { "scene-name": sceneList.scenes[1].name })
                .catch( (err) => {
                    console.log(err);
                });
            }
            else if(params.note === 69 && params.velocity > 0) {
                obs.send('SetCurrentScene', { "scene-name": sceneList.scenes[2].name })
                .catch( (err) => {
                    console.log(err);
                });
            }
            else if(params.note === 59 && params.velocity > 0) {
                obs.send('SetCurrentScene', { "scene-name": sceneList.scenes[3].name })
                .catch( (err) => {
                    console.log(err);
                });
            }
            else if(params.note === 49 && params.velocity > 0) {
                obs.send('SetCurrentScene', { "scene-name": sceneList.scenes[4].name })
                .catch( (err) => {
                    console.log(err);
                });
            }
            else if(params.note === 39 && params.velocity > 0) {
                obs.send('SetCurrentScene', { "scene-name": sceneList.scenes[5].name })
                .catch( (err) => {
                    console.log(err);
                });
            }
            else if(params.note === 29 && params.velocity > 0) {
                obs.send('SetCurrentScene', { "scene-name": sceneList.scenes[6].name })
                .catch( (err) => {
                    console.log(err);
                });
            }
            else if(params.note === 19 && params.velocity > 0) {
                obs.send('SetCurrentScene', { "scene-name": sceneList.scenes[7].name })
                .catch( (err) => {
                    console.log(err);
                });
            }
        })
        .catch((err) => {
            console.log('There was an error retrieving the list of scenes. please report this error: ' + err);
        });

    });
}
