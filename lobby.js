/*var serverlist = new Array();
var serverlistlength = 0;*/

//Enums
var Type = {
    PING: 0,
    PONG: 1,
    LOGINDEX: 2,
    LOGOUT: 3,
    GAMEINFO: 4,
    JOINGAME: 5,
    JOINPLAY: 6,
    LOBBYACTION: 7,
    MSG: 8,
    SYSTEM: 9,
    GAMEACTION: 10
};

var LobbyMusic = new Audio('Homecoming.mp3');
LobbyMusic.loop = true;

$(document).ready(function () {
    $('#serverselect').change(function () {
        console.log(getselectedserver());
    });
    $(document).on('input', '#musicrange', function () {
        if ($('#musicrange').val() == 0) {
            mutemusic();
        }
        else {
            playmusic();
        }
        setCookie('volume', ($('#musicrange').val()), 'Sat, 31 Dec 2039 23:59:59 GMT');
        LobbyMusic.volume = (getCookie('volume') / 100);
    });
    if (checkCookie('volume')) {
        $('#musicrange').val(getCookie('volume'));
        LobbyMusic.volume = (getCookie('volume') / 100);
    }
    if (checkCookie('music')) {
        if (getCookie('music') == 'on') {
            $('#music').attr('src', 'music.png');
            LobbyMusic.play();
        }
        else {
            $('#music').attr('src', 'nomusic.png');
        }
    }
    else {
        $('#music').attr('src', 'music.png');
        LobbyMusic.play();
    }
});

var socket = io.connect({ 'pingInterval': 45000 });

function mutemusic() {
    $('#music').attr('src', 'nomusic.png');
    $('#music').attr('onclick', 'playmusic()');
    setCookie('music', 'off', 'Sat, 31 Dec 2039 23:59:59 GMT');
    LobbyMusic.pause();
}

function playmusic() {
    $('#music').attr('src', 'music.png');
    $('#music').attr('onclick', 'mutemusic()');
    setCookie('music', 'on', 'Sat, 31 Dec 2039 23:59:59 GMT');
    if (LobbyMusic.paused) {
        LobbyMusic.currentTime = 0;
        LobbyMusic.play();
    }
}

function setCookie(cname, cvalue, expires) {
    document.cookie = cname + "=" + cvalue + ";expires=" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function checkCookie(cname) {
    var cookie = getCookie(cname);
    if (cookie != "") {
        return true;
    }
    else {
        return false;
    }
}

function logout() {
    document.cookie = 'username' + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    socket.emit(Type.LOGOUT, 'toserver');
}

function showgamemodes() {
    $('#mainbox').html('<button onclick="delmainbox();">X</button><select id="gamemodeselect" size="2"><option>Automod</option><option disabled>Modded Game</option></select><button onclick="joinlobby();">Join Lobby</button>\n');
}

function delmainbox() {
    $('#mainbox').html('');
}

function joinlobby() {
    var modeselect_element = document.getElementById('gamemodeselect');
    var modeselect = modeselect_element.value.trim();
    socket.emit(Type.JOINGAME, 'toserver', modeselect);
}

/*function getselectedserver() {
    var serverselect_element = document.getElementById('serverselect');
    var serverselect = serverselect_element.value.trim();
    return serverselect;
}*/

socket.on('disconnect', function () {
    $('#error').html('You disconnected from the Server! Please press F5 and login again!');
    $('#error').css('display', 'block');
});

socket.on(Type.PING, function () {
    socket.emit(Type.PONG);
});

socket.on(Type.LOGOUT, function (to) {
    window.location.reload();
});

socket.on(Type.JOINGAME, function (to, back) {
    if (back == 'error') {
        $('#error').html('Your account is already in a game. If you believe this is an error pelase contact an Administrator.');
        $('#error').css('display', 'block');
        setTimeout(function () { $('#error').css('display', 'none'); }, 5000);
    }
    else if (back == 'success') {
        window.location.reload();
    }
    else {
        $('#error').html('You must select a Gamemode before joining a Lobby!');
        $('#error').css('display', 'block');
        setTimeout(function () { $('#error').css('display', 'none'); }, 5000);
    }
});

/*socket.on(Type.SERVERLIST, function (SERVERLIST) {
    $('#lobbylist').html('');
    var SERVERS = SERVERLIST.split(';');
    serverlistlength = 0;
    for (i in SERVERS) {
        serverlistlength++;
        serverlist[i] = [];
        var SERVER = SERVERS[i].split('|');
        serverlist[i][0] = SERVER[0];
        serverlist[i][1] = SERVER[1];
        if (SERVER[2] != []) {
            var USERS = SERVER[2].split(',');
            serverlist[i][2] = [];
            for (j in USERS) {
                serverlist[i][2][j] = USERS[j];
            }
        }
        else serverlist[i][2] = SERVER[2];
        serverlist[i][3] = SERVER[3];
        serverlist[i][4] = SERVER[4];
        if ($('#serverselect option').size() - 1 < i) {
            $('#serverselect').append(`<option id='Server${parseInt(i) + 1}'>Server #${parseInt(i) + 1}</option>`);
            $('#serverselect').attr('size', parseInt(i) + 1);
        }
    }
    if (serverlistlength == serverlist.length) {

    }
    else {

    }
});

setTimeout(function () { console.log(serverlist) }, 5000);*/