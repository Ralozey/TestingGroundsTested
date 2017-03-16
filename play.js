//Enums
var Type = {
    LOGINDEX: 0,
    LOGOUT: 1,
    GAMEINFO: 2,
    JOINGAME: 3,
    JOINPLAY: 4
};

$(document).ready(function () {

});

function updateplayerlist(Array) {
    var result = '';
    var j = 0;
    for (i in Array) {
        result += `<li>${Array[i]}</li>`;
        j++;
    }
    while (j < 15) {
        result += `<li></li>`
        j++;
    }
    return result;
}

var socket = io.connect({ 'pingInterval': 45000 });

socket.on(Type.GAMEINFO, function (GAMEINFO) {
    if (GAMEINFO[1] == 'LOBBY') {
        $('#playerlist').html(updateplayerlist(GAMEINFO[0]));
    }
});

socket.on('connect', function () {
    socket.emit(Type.JOINPLAY);
});