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

var LoginMusic = new Audio('Forecasting.mp3');
LoginMusic.loop = true;

$(document).ready(function () {
    $('#username').keyup(function () {
        $('#send').attr('disabled', false);
        $('#error').css('display', 'none');
        checkName($('#username').val());
    });
    $('#password').keyup(function () {
        $('#send').attr('disabled', false);
        $('#error').css('display', 'none');
        checkPW($('#password').val());
    });
    $('#username').keydown(function (e) {
        if (e.keyCode == 13) {
            if (!$('#send').attr('disabled')) {
                loginindex();
            }
            else {
                $('#send').attr('disabled', 'disabled');
            }
        }
    });
    $('#password').keydown(function (e) {
        if (e.keyCode == 13) {
            if (!$('#send').attr('disabled')) {
                loginindex();
            }
            else {
                $('#send').attr('disabled', 'disabled');
            }
        }
    });
    $('#musicrange').change(function () {
        if ($('#musicrange').val() == 0) {
            mutemusic();
        }
        else {
            playmusic();
        }
        setCookie('volume', ($('#musicrange').val()), 'Sat, 31 Dec 2039 23:59:59 GMT');
        LoginMusic.volume = (getCookie('volume') / 100);
    });
    if (checkCookie('volume')) {
        $('#musicrange').val(getCookie('volume'));
        LoginMusic.volume = (getCookie('volume')/100);
    }
    if (checkCookie('music')) {
        if (getCookie('music') == 'on') {
            $('#music').attr('src', 'music.png');
            LoginMusic.play();
        }
        else {
            $('#music').attr('src', 'nomusic.png');
        }
    }
    else {
        $('#music').attr('src', 'music.png');
        LoginMusic.play();
    }
});

var socket = io.connect({ 'pingInterval': 45000 });

function mutemusic() {
    $('#music').attr('src', 'nomusic.png');
    $('#music').attr('onclick', 'playmusic()');
    setCookie('music', 'off', 'Sat, 31 Dec 2039 23:59:59 GMT');
    LoginMusic.pause();
}

function playmusic() {
    $('#music').attr('src', 'music.png');
    $('#music').attr('onclick', 'mutemusic()');
    setCookie('music', 'on', 'Sat, 31 Dec 2039 23:59:59 GMT');
    if (LoginMusic.paused) {
        LoginMusic.currentTime = 0;
        LoginMusic.play();
    }
}

function checkName(name) {
    $.ajax({
        url: '/namecheck', data: name, success: function (result) {
            if (result == 'invalid') {
                $('#error').html('Names may only contain letters, numbers, underscores and dashes.');
                $('#error').css('display', 'block');
                $('#send').attr('disabled', 'disabled');
            }
            else if (result == 'empty') {
                $('#error').html('Your name cannot be empty.');
                $('#error').css('display', 'block');
                $('#send').attr('disabled', 'disabled');
            }
            else if (result == 'noletters') {
                $('#error').html('Your name must contain at least one letter.');
                $('#error').css('display', 'block');
                $('#send').attr('disabled', 'disabled');
            }
            else if (result == 'toolong') {
                $('#error').html('Your name cannot be more than 20 characters.');
                $('#error').css('display', 'block');
                $('#send').attr('disabled', 'disabled');
            }
            else if (result == 'lol') {
                $('#error').html('Very clever. Truly we are but peons in the shadow of your vast intellect.');
                $('#error').css('display', 'block');
            }
        }, error: function () {
            $('#error').html('Error! Unable to perform AJAX request. Please inform the Server Administrator about that!');
            $('#error').css('display', 'block');
        }
    });
};

function checkPW(PW) {
    if (PW.length == 0) {
        $('#error').html('You have to enter a valid password!');
        $('#error').css('display', 'block');
        $('#send').attr('disabled', 'disabled');
    }
};

function loginindex() {
    var username_element = document.getElementById('username');
    var password_element = document.getElementById('password');

    var username = username_element.value.trim();
    var password = password_element.value.trim();

    socket.emit(Type.LOGINDEX, 'toserver', username, password);
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

socket.on(Type.PING, function () {
    socket.emit(Type.PONG);
});

socket.on(Type.LOGINDEX, function (to, username, value) {
    if (to == 'toclient') {
        switch (value) {
            case 'success':
                /*$('#error').html('The Login was successful! You are being redirected!');
                $('#error').css('display', 'block');
                $('#send').attr('disabled', 'disabled');
                window.setTimeout(function () {
                    document.location.reload();
                }, 3000);
                break;*/
                window.location.reload();
                break;
            case 'error':
                $('#error').html('Your Username or Password are incorrect. Please check your input!');
                $('#error').css('display', 'block');
                $('#send').attr('disabled', 'disabled');
                break;
            case 'alreadyin':
                $('#error').html('Someone is already logged in with that account. If you believe this is an error please contact an administrator!');
                $('#error').css('display', 'block');
                $('#send').attr('disabled', 'disabled');
                break;
        }
    }
});