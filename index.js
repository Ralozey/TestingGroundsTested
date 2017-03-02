//Enums
var Type = {
    LOGINDEX: 0,
    LOGOUT: 1
};

$(document).ready(function () {
    $('#username').keyup(function () {
        $('#send').attr('disabled', false);
        $('#error').css('display', 'none');
        checkName($('#username').val());
    });
    $('#password').keyup(function () {
        $('#send').attr('disabled', false);
        $('#error').css('display', 'none');
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
});

var socket = io.connect({ 'pingInterval': 45000 });

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
            console.log('ERROR! Unable to make AJAX request.');
        }
    });
};

function loginindex() {
    var username_element = document.getElementById('username');
    var password_element = document.getElementById('password');

    var username = username_element.value.trim();
    var password = password_element.value.trim();

    socket.emit(Type.LOGINDEX, 'toserver', username, password);
}

function setCookie(cname, cvalue) {
    document.cookie = cname + "=" + cvalue + ";path=/";
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

socket.on(Type.LOGINDEX, function (to, username, value) {
    if (to == 'toclient') {
        switch (value) {
            case 'success':
                $('#error').html('The Login was successful! You are being redirected!');
                $('#error').css('display', 'block');
                $('#send').attr('disabled', 'disabled');
                setCookie('username', username);
                window.setTimeout(function () {
                    document.location.reload();
                }, 3000);
                break;
            case 'error':
                $('#error').html('Your Username or Password are incorrect. Please check your input!');
                $('#error').css('display', 'block');
                $('#send').attr('disabled', 'disabled');
        }
    }
});