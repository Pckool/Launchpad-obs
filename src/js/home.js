const {ipcRenderer} = require('electron');

$(document).ready(function() {
    $('#conn-to-obs').on('click', () => {
        let websocket_dat = {
            port: parseInt($('#port-num').val()),
            password: $('#pass').val()
        }
        ipcRenderer.send('start-OBS', websocket_dat);
        ipcRenderer.once('OBS-conn', populateDat);
    });
});

function populateDat(){
    $("#connect-obs-row").collapse('hide');
    getScenes();
    getStats();
}

function getScenes(){
    ipcRenderer.send('get-scenes');
}
ipcRenderer.on('sceneList', (event, sceneList) => {
    console.log('scene');
    console.log(sceneList);
    $('<div/>', {
        id: "sceneList-box",
        class: "sub-box"
    }).replaceAll('#scenes-list .sub-box');
    for( var i=0; i < sceneList.scenes.length; i++){
        $('<p/>', {
            class: "scenes-list-item"
        })
        .html(`${sceneList.scenes[i].name}`).appendTo('#sceneList-box');
    }

});

function getStats(){
    ipcRenderer.send('get-stats');
}
ipcRenderer.on('statsList', (event, statsList) => {
    console.log('stats');
    console.log(statsList);
    $('<div/>', {
        id: "statsList-box",
        class: "sub-box"
    }).replaceAll('#stats-list .sub-box');

    $('<p/>', {
        class: "stats-list-item"
    })
    .html(`kbps: ${statsList["kbits-per-sec"]}`).appendTo('#statsList-box');
    $('<p/>', {
        class: "stats-list-item"
    })
    .html(`Dropped Frames: ${statsList["strain"]}`).appendTo('#statsList-box');
    $('<p/>', {
        class: "stats-list-item"
    })
    .html(`Encoder Lag: ${statsList["num-dropped-frames"]}/${statsList["num-total-frames"]} = ${statsList["num-dropped-frames"]/statsList["num-total-frames"]}`).appendTo('#statsList-box');
});
