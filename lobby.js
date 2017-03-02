//Enums
var Type = {
    LOGINDEX: 0,
    LOGOUT: 1
};

var socket = io.connect({ 'pingInterval': 45000 });

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

function logout() {
    var username = getCookie('username');
    document.cookie = 'username' + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    socket.emit(Type.LOGOUT, 'toserver', username);
}

socket.on(Type.LOGOUT, function (to, username) {
    document.location.reload();
});