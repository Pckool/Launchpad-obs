const {ipcRenderer} = require('electron');
const $ = require('jquery');

$(document).ready(function() {
    $('#conn-to-obs').on('click', () => {
        let websocket_dat = {
            port: parseInt($('#port-num').val()),
            password: $('#pass').val()
        }
        ipcRenderer.send('start-OBS', websocket_dat);
        ipcRenderer.once('OBS-conn', getScenes);
    });
});

function getScenes(){
    ipcRenderer.send('get-scenes');
}
ipcRenderer.on('sceneList', (event, sceneList) => {
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
