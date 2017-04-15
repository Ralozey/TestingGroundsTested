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

var socket = io.connect({ 'pingInterval': 45000 });
var thishost = false;
var phase = 'LOBBY';

var PregameMusic = new Audio('GreenMeadows.mp3');
var PreparingMusic = new Audio('WhoAmI.mp3');
PregameMusic.loop = true;

$(document).ready(function () {
    $('#roleallign').change(function () {
        var updateselects = updateselect(roles, $("#roleallign option:selected").attr("id"));
        $('#roleselect').attr('size', updateselects[1]);
        $('#roleselect').html(updateselects[0]);
        $('#roleselect').css('display', 'inline');
    });
    $('#musicrange').change(function () {
        if ($('#musicrange').val() == 0) {
            mutemusic();
        }
        else {
            playmusic();
        }
        setCookie('volume', ($('#musicrange').val()), 'Sat, 31 Dec 2039 23:59:59 GMT');
        PregameMusic.volume = (getCookie('volume') / 100);
        PreparingMusic.volume = (getCookie('volume') / 100);
    });
    if (checkCookie('volume')) {
        $('#musicrange').val(getCookie('volume'));
        PregameMusic.volume = (getCookie('volume') / 100);
    }
    if (checkCookie('music')) {
        if (getCookie('music') == 'on') {
            $('#music').attr('src', 'music.png');
            PregameMusic.play();
        }
        else {
            $('#music').attr('src', 'nomusic.png');
        }
    }
    else {
        $('#music').attr('src', 'music.png');
        PregameMusic.play();
    }
});

function mutemusic() {
    $('#music').attr('src', 'nomusic.png');
    $('#music').attr('onclick', 'playmusic()');
    setCookie('music', 'off', 'Sat, 31 Dec 2039 23:59:59 GMT');
    if (phase == 'LOBBY') {
        PregameMusic.pause();
    }
    else if (phase == 'PREPARING') {
        PreparingMusic.volume = 0;
    }
}

function playmusic() {
    $('#music').attr('src', 'music.png');
    $('#music').attr('onclick', 'mutemusic()');
    setCookie('music', 'on', 'Sat, 31 Dec 2039 23:59:59 GMT');
    if (phase == 'LOBBY') {
        if (PregameMusic.paused) {
            PregameMusic.currentTime = 0;
            PregameMusic.play();
        }
    }
    else if (phase == 'PREPARING') {
        if (checkCookie('volume')) {
            PreparingMusic.volume = (getCookie('volume')/100);
        }
        else {
            PreparingMusic.volume = 1;
        }
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

function addMessage(msg, type) {
    //Check if scrolled to bottom.
    var atBottom = (10 + $('#chatfield').scrollTop() + $('#chatfield').prop('offsetHeight') >= $('#chatfield').prop('scrollHeight'));
    switch (type) {
        case 'msg':
            $('#chatfield').append('<li>' + msg + '</li>');
            break;
        case 'system':
            $('#chatfield').append('<li><b>' + msg + '</b></li>');
            break;
    }
    if (atBottom) {
        //Scroll down.
        var end = $("#chatfield").prop('scrollHeight');
        $("#chatfield").prop('scrollTop', end);
    }
}

function removerole() {
    socket.emit(Type.LOBBYACTION, 'removerole', $("#rolelist option:selected").attr("id"), '');
}

function addrole() {
    socket.emit(Type.LOBBYACTION, 'addrole', $("#roleselect option:selected").attr("id"), '');
}

function leavelobby() {
    socket.emit(Type.LOBBYACTION, 'leavelobby', '', '');
}

function startgame() {
    socket.emit(Type.LOBBYACTION, 'startgame', '', '');
}

function checkKeyL(e) {
    if (e.keyCode == 13 && $('#c').val() != '') //Enter
    {
        var msg = $('#c').val();
        $('#c').val('');
        socket.emit(Type.MSG, msg);
    }
    //Limit length
    if ($('#c').val().length >= 200) {
        $('#c').val($('#c').val().substring(0, 199));
    }
}

function checkKeyP(e) {
    if (e.keyCode == 13 && $('#n').val() != '') //Enter
    {
        var name = $('#n').val();
        $('#n').val('');
        socket.emit(Type.GAMEACTION, 'setname', name, '');
    }
    //Limit length
    if ($('#n').val().length >= 200) {
        $('#n').val($('#n').val().substring(0, 199));
    }
}

function updatelist(Array, Host) {
    var result = '';
    var j = 0;
    for (i in Array) {
        j++;
        if (Array[i] == Host) {
            result += `<option id="${j}">${Array[i]} HOST</option>`;
        }
        else {
            result += `<option id="${j}">${Array[i]}</option>`;
        }
    }
    return result;
}

function updaterolelist(Array) {
    var result = '';
    var j = 0;
    for (var z in Array) {
        j++;
        for (var i in roles) {
            for (var j in roles[i]) {
                if (j != 'name' && j != 'color' && j != 'id') {
                    if (j == Array[z]) {
                        result += `<option style="color: #${roles[i][j].color}" id="${Array[z]}">${roles[i][j].name}</option>`;
                    }
                    else {
                        for (var k in roles[i][j]) {
                            if (k != 'name' && k != 'color' && k != 'id') {
                                if (k == Array[z]) {
                                    result += `<option style="color: #${roles[i][j][k].color}" id="${Array[z]}">${roles[i][j][k].name}</option>`;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return result;
}

function updateoption(Array) {
    var result = '';
    var j = 0;
    for (i in Array) {
        j++;
        result += `<option style="color: #${Array[i].color}" id="${j}">${Array[i].name}</option>`;
    }
    j++;
    result += `<option style="color: #0000FF" id="${999}">Random</option>`;
    return [result,j];
}

function updateselect(Array, id) {
    var result = '';
    var j = 0;
    for (i in Array) {
        if (id == 999) {
            for (k in Array[i]) {
                if (k != 'name' && k != 'color' && k != 'id') {
                    j++;
                    result += `<option style="color: #${Array[i][k].color}" id="${k}">${Array[i][k].name}</option>`;
                }
            }
        }
        else if (Array[i].id == id) {
            for (k in Array[i]) {
                if (k != 'name' && k != 'color' && k != 'id') {
                    for (l in Array[i][k]) {
                        if (l != 'name' && l != 'color' && l != 'attributes') {
                            j++;
                            result += `<option style="color: #${Array[i][k].color}" id="${l}">${Array[i][k][l].name}</option>`;
                        }
                    }
                }
            }
        }
    }
    return [result, j];
}

socket.on(Type.PING, function () {
    socket.emit(Type.PONG);
});

socket.on(Type.GAMEINFO, function (GAMEINFO) {
    if (GAMEINFO[3] == GAMEINFO[4]) {
        thishost = true;
    }
    else {
        thishost = false;
    }
    if (GAMEINFO[1] == 'LOBBY') {
        phase = 'LOBBY';
        $('#playerlist').html(updatelist(GAMEINFO[0], GAMEINFO[3]));
        $('#rolelist').html(updaterolelist(GAMEINFO[2]));
        let updateoptions = updateoption(roles);
        $('#roleallign').attr('size', updateoptions[1]);
        $('#roleallign').html(updateoptions[0]);
        $('#roleallign').css('display', 'inline');
        if (!$('#rolelistdiv').html().includes(`<button id="removerole"`)) {
            $('#rolelistdiv').html(`${$('#rolelistdiv').html()}<button id="removerole" onclick="removerole();">Remove Role</button>`)
        }
        if (!$('#roleselectdiv').html().includes(`<button id="addrole"`)) {
            $('#roleselectdiv').html(`${$('#roleselectdiv').html()}<button id="addrole" onclick="addrole();">Add Role</button>`)
        }
        if (thishost) {
            $('#roleallign').attr('disabled', false);
            $('#rolelist').attr('disabled', false);
            $('#roleselect').attr('disabled', false);
            $('#removerole').attr('disabled', false);
            $('#addrole').attr('disabled', false);
            $('#startgame').attr('disabled', false);
        }
        else {
            $('#roleallign').attr('disabled', true);
            $('#rolelist').attr('disabled', true);
            $('#roleselect').attr('disabled', true);
            $('#removerole').attr('disabled', true);
            $('#addrole').attr('disabled', true);
            $('#startgame').attr('disabled', true);
        }
    }
    $('#timer').html((GAMEINFO[5])%25);
});

socket.on('connect', function () {
    socket.emit(Type.JOINPLAY);
});

socket.on('disconnect', function () {
    addMessage(`You disconnected from the Server! Please press F5 and login again!`, 'system');
});

socket.on(Type.SYSTEM, function (msg) {
    addMessage(msg, 'system');
});

socket.on(Type.MSG, function (msg, type) {
    addMessage(msg, type);
});

socket.on(Type.LOBBYACTION, function (func) {
    switch (func) {
        case 'leavecomplete':
            window.location.reload();
            break;
        case 'gamestart':
            phase = 'PREPARING';
            PregameMusic.pause();
            PreparingMusic.play();
            if (getCookie('music') != 'off') {
                if (checkCookie('volume')) {
                    PreparingMusic.volume = (getCookie('volume')/100);
                }
                else {
                    setCookie('volume', '100', 'Sat, 31 Dec 2039 23:59:59 GMT');
                    PreparingMusic.volume = 1;
                }
            }
            else {
                setCookie('volume', '0  ', 'Sat, 31 Dec 2039 23:59:59 GMT');
                PreparingMusic.volume = 0;
            }
            $('#lobbystuff').remove();
            $('#playerlist').css('display', 'none');
            $('#generalgame').html(`${$('#generalgame').html()}<div id="timer"></div><div id="preparestuff"><input type='text' id='n' onKeyDown='checkKeyP(event)' /></div>`);
            break;
    }
});