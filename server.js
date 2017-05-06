"use strict";

var http = require('http');
var url = require('url');
var fs = require('fs');
var pg = require('pg');
var roles = require('./roles');
var IP_USER = new Array;
var userlist = new Array;
var gameserverlist = new Array;
//var express = require('express');
//var session = require('express-session');
var Server = require('socket.io');
var request = require('request');
var MOD_LIST = ['Ralozey', 'Jerme'];
var io = new Server(http, { pingInterval: 5000, pingTimeout: 10000 });

var headers = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
}

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

var PhaseType = {
    LOBBY: 0,
    PREPARING: 1
}

ping();
pingtimer();
timer1();

/*pg.connect(process.env.DATABASE_URL, function (err, client) {
    if (err) throw err;
    console.log('Connected to postgres! Getting schemas...');

    client
      .query('SELECT table_schema,table_name FROM information_schema.tables;')
      .on('row', function (row) {
          console.log(JSON.stringify(row));
      });
});*/

//Timer Function
function timer1() {
    for (var i in gameserverlist) {
        if (gameserverlist[i].get('TIMER') > 0) {
            gameserverlist[i].set('TIMER', (gameserverlist[i].get('TIMER') - 1));
            var PLAYERS = gameserverlist[i].get('PLAYERS');
            for (var j in PLAYERS) {
                userlist[PLAYERS[j]].get('SOCKET').emit(Type.GAMEINFO, [gameserverlist[i].get('PLAYERS'), gameserverlist[i].get('PHASE'), gameserverlist[i].get('ROLELIST'), gameserverlist[i].get('HOST'), PLAYERS[j], gameserverlist[i].get('TIMER'), gameserverlist[i].get('CUSTOM'), userlist[PLAYERS[j]].get('ROLE')]);
            }

        }
    }
    setTimeout(timer2, 1000);
}

function timer2 () {
    setTimeout(timer1, 0);
}

//Pinging functions
function ping() {
    for (var i in userlist) {
        if (userlist[i].get('SOCKET') != '') {
            userlist[i].set('PING', -1);
            userlist[i].set('PINGTIME', 0);
            userlist[i].get('SOCKET').emit(Type.PING);
        }
    }
    setTimeout(checkPing, 10000);
}

//DISCONNECT FUNCTION
function checkPing() {
    for (var i in userlist) {
        if (userlist[i].get('PING') == -1) {
            if (userlist[i].get('PINGATTEMPTS') > 3) {
                let IP = userlist[i].get('IP');
                let SERVERNAME = userlist[i].get('SERVER');
                //Player did not reply after 3 ping attempts. Disconnecting.
                userlist[i].get('SOCKET').disconnect();
                console.log(`${IP}(${i}) disconnected. Deleting their User File.`);
                if (userlist[i].get('POSITION') == 'INGAME') {
                    gameserverlist[SERVERNAME].remove('PLAYER', i);
                    if (gameserverlist[SERVERNAME].get('HOST') == i) {
                        if (gameserverlist[SERVERNAME].get('PLAYERCOUNT') < 1) {
                            console.log(`Server ${SERVERNAME} is empty. Deleting...`);
                            delete gameserverlist[SERVERNAME];
                        }
                        else {
                            gameserverlist[SERVERNAME].set('HOST', gameserverlist[SERVERNAME].get('PLAYERS')[0]);
                        }
                    }
                    try { sendgameinfo(SERVERNAME) } catch (err) { };
                }
                delete IP_USER[IP];
                delete userlist[i];
            }
            else {
                let pingattempts = userlist[i].get('PINGATTEMPTS');
                pingattempts++;
                userlist[i].set('PINGATTEMPTS', pingattempts);
            }
        }
    }
    setTimeout(ping, 0);
}

function pingtimer() {
    for (var i in userlist) {
        if (userlist[i].get('PING') == -1) {
            userlist[i].set('PINGTIME', userlist[i].get('PINGTIME') + 10);
        }
    }
    setTimeout(pingtimer, 10);
}

function getIp(socket) {
    return (socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address || '::1');
}
function getIpReq(req) {
    return (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress);
}
function createUser(USERNAME) {
    if (MOD_LIST.indexOf(USERNAME) == -1) {
        userlist[USERNAME] = new User('INDEX', false);
    }
    else {
        userlist[USERNAME] = new User('INDEX', true);
    }
}

function createID(LENGTH) {
    var ID = '';
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i = 0; i < LENGTH; i++) {
        ID += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return ID;
}

function createGameServer(PHASE, CUSTOM) {
    var gameservercount = howmanygameservers();
    while (true) {
        var SERVERNAME = createID(7);
        if (gameserverlist[SERVERNAME] == undefined) {
            gameserverlist[SERVERNAME] = new GameServer(PHASE, gameservercount + 1, CUSTOM);
            return SERVERNAME;
        }
    }
}

function howmanygameservers() {
    var result = 0;
    for (var a in gameserverlist) {
        if (gameserverlist.hasOwnProperty(a)) {
            // or Object.prototype.hasOwnProperty.call(obj, prop)
            result++;
        }
    }
    return result;
}

function sendgameinfo(SERVERNAME) {
    var PLAYERS = gameserverlist[SERVERNAME].get('PLAYERS');
    for (var i in PLAYERS) {
        userlist[PLAYERS[i]].get('SOCKET').emit(Type.GAMEINFO, [gameserverlist[SERVERNAME].get('PLAYERS'), gameserverlist[SERVERNAME].get('PHASE'), gameserverlist[SERVERNAME].get('ROLELIST'), gameserverlist[SERVERNAME].get('HOST'), PLAYERS[i], gameserverlist[SERVERNAME].get('TIMER'), gameserverlist[SERVERNAME].get('CUSTOM'), userlist[PLAYERS[i]].get('ROLE')]);
    }
    //io.sockets.in(SERVERNAME).emit(Type.GAMEINFO, [gameserverlist[SERVERNAME].get('PLAYERS'), gameserverlist[SERVERNAME].get('PHASE'), gameserverlist[SERVERNAME].get('ROLELIST'), gameserverlist[SERVERNAME].get('HOST')]);
}

function sanitize(msg) {
    msg = msg.replace(/&/g, "&amp"); //This needs to be replaced first, in order to not mess up the other codes.
    msg = msg.replace(/</g, "&lt;");
    msg = msg.replace(/>/g, "&gt;");
    msg = msg.replace(/\"/g, "&quot;");
    msg = msg.replace(/\'/g, "&#39;");
    msg = msg.replace(/:/g, "&#58;");
    return msg;
}



var server = http.createServer(function (req, res) {
    var IP_REQ = getIpReq(req);
    var path = url.parse(req.url).pathname;
    //Routing
    switch (path) {
        case '/':
            if (IP_USER[IP_REQ]) {
                if (userlist[IP_USER[IP_REQ]].get('POSITION') == 'INGAME') {
                    if (gameserverlist[userlist[IP_USER[IP_REQ]].get('SERVER')].get('PHASE') == 'LOBBY') {
                        fs.readFile(__dirname + '/play.html', function (error, data) {
                            if (error) {
                                res.writeHead(404);
                                res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                                res.end();
                            }
                            else {
                                res.writeHead(200, { "Content-Type": "text/html" });
                                res.write(data, "utf8");
                                console.log(`${IP_REQ}(${IP_USER[IP_REQ]}) is now INGAME on Server ${userlist[IP_USER[IP_REQ]].get('SERVER')}`);
                                res.end();
                            }
                        });
                    }
                    else {
                        let USERNAME = IP_USER[IP_REQ];
                        let SERVERNAME = userlist[USERNAME].get('SERVER');
                        userlist[USERNAME].set('POSITION', 'LOBBY');
                        userlist[USERNAME].set('SERVER', false);
                        userlist[USERNAME].set('ROLE', false);
                        gameserverlist[SERVERNAME].remove('PLAYER', USERNAME);
                        console.log(`${IP_REQ}(${USERNAME}) left Server ${SERVERNAME}`);
                        io.sockets.in(SERVERNAME).emit(Type.SYSTEM, `${USERNAME} has left the game.`);
                        if (gameserverlist[SERVERNAME].get('HOST') == USERNAME) {
                            if (gameserverlist[SERVERNAME].get('PLAYERCOUNT') < 1) {
                                console.log(`Server ${SERVERNAME} is empty. Deleting...`);
                                delete gameserverlist[SERVERNAME];
                            }
                            else {
                                gameserverlist[SERVERNAME].set('HOST', gameserverlist[SERVERNAME].get('PLAYERS')[0]);
                            }
                        }
                        try { sendgameinfo(SERVERNAME) } catch (err) { };
                        if (userlist[IP_USER[IP_REQ]].get('MOD')) {
                            fs.readFile(__dirname + '/lobbyMOD.html', function (error, data) {
                                if (error) {
                                    res.writeHead(404);
                                    res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                                    res.end();
                                }
                                else {
                                    res.writeHead(200, { "Content-Type": "text/html" });
                                    res.write(data, "utf8");
                                    userlist[IP_USER[IP_REQ]].set('POSITION', 'LOBBY');
                                    console.log(`${IP_REQ}(${IP_USER[IP_REQ]}) is now on LOBBY`);
                                    res.end();
                                }
                            });
                        }
                        else {
                            fs.readFile(__dirname + '/lobby.html', function (error, data) {
                                if (error) {
                                    res.writeHead(404);
                                    res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                                    res.end();
                                }
                                else {
                                    res.writeHead(200, { "Content-Type": "text/html" });
                                    res.write(data, "utf8");
                                    userlist[IP_USER[IP_REQ]].set('POSITION', 'LOBBY');
                                    console.log(`${IP_REQ}(${IP_USER[IP_REQ]}) is now on LOBBY`);
                                    res.end();
                                }
                            });
                        }
                    }
                }
                else {
                    if (userlist[IP_USER[IP_REQ]].get('MOD')) {
                        fs.readFile(__dirname + '/lobbyMOD.html', function (error, data) {
                            if (error) {
                                res.writeHead(404);
                                res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                                res.end();
                            }
                            else {
                                res.writeHead(200, { "Content-Type": "text/html" });
                                res.write(data, "utf8");
                                userlist[IP_USER[IP_REQ]].set('POSITION', 'LOBBY');
                                console.log(`${IP_REQ}(${IP_USER[IP_REQ]}) is now on LOBBY`);
                                res.end();
                            }
                        });
                    }
                    else {
                        fs.readFile(__dirname + '/lobby.html', function (error, data) {
                            if (error) {
                                res.writeHead(404);
                                res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                                res.end();
                            }
                            else {
                                res.writeHead(200, { "Content-Type": "text/html" });
                                res.write(data, "utf8");
                                userlist[IP_USER[IP_REQ]].set('POSITION', 'LOBBY');
                                console.log(`${IP_REQ}(${IP_USER[IP_REQ]}) is now on LOBBY`);
                                res.end();
                            }
                        });
                    }
                }
            }
            else {
                fs.readFile(__dirname + '/index.html', function (error, data) {
                    if (error) {
                        res.writeHead(404);
                        res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                        res.end();
                    }
                    else {
                        res.writeHead(200, { "Content-Type": "text/html" });
                        res.write(data, "utf8");
                        res.end();
                    }
                });
            }
            break;
        case '/jquery-2.1.4.min.js':
        case '/index.js':
            fs.readFile(__dirname + path, function (error, data) {
                if (error) {
                    res.writeHead(404);
                    res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                    res.end();
                }
                else {
                    res.writeHead(200, { "Content-Type": "text/js" });
                    res.write(data, "utf8");
                    res.end();
                }
            });
            break;
        case '/lobby.js':
        case '/play.js':
        case '/roles.js':
            if (IP_USER[IP_REQ]) {
                fs.readFile(__dirname + path, function (error, data) {
                    if (error) {
                        res.writeHead(404);
                        res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                        res.end();
                    }
                    else {
                        res.writeHead(200, { "Content-Type": "text/js" });
                        res.write(data, "utf8");
                        res.end();
                    }
                });
            }
            else {
                res.writeHead(403);
                res.write('<title>403</title>You do not have permission to access this page.');
                res.end();
            }
            break;
        case '/index.css':
            fs.readFile(__dirname + path, function (error, data) {
                if (error) {
                    res.writeHead(404);
                    res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                    res.end();
                }
                else {
                    res.writeHead(200, { "Content-Type": "text/css" });
                    res.write(data, "utf8");
                    res.end();
                }
            });
            break;
        case '/lobby.css':
        case '/play.css':
            if (IP_USER[IP_REQ]) {
            fs.readFile(__dirname + path, function (error, data) {
                if (error) {
                    res.writeHead(404);
                    res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                    res.end();
                }
                else {
                    res.writeHead(200, { "Content-Type": "text/css" });
                    res.write(data, "utf8");
                    res.end();
                }
            });
            }
            else {
                res.writeHead(403);
                res.write('<title>403</title>You do not have permission to access this page.');
                res.end();
            }
            break;
        case '/namecheck':
            var name = url.parse(req.url).query;
            if (name && typeof name == 'string') {
                res.writeHead(200, { "Content-Type": "text/plain" });
                if (name.length == 0) {
                    res.write('empty');
                }
                else if (name.toLowerCase() == 'empty') {
                    res.write('lol');
                }
                else if (!(/[a-z]/i.test(name))) {
                    res.write('noletters');
                }
                else if (/^[a-z0-9-_]+$/i.test(name)) {
                    res.write('good');
                }
                else {
                    res.write('invalid');
                }
            }
            else {
                res.write('empty');
            }
            res.end();
            break;
        case '/CalmBeforeTheStorm.mp3':
        case '/CareFree.mp3':
        case '/DarkAlley.mp3':
        case '/DarkHolidays.mp3':
        case '/GreenMeadows.mp3':
        case '/Heated.mp3':
        case '/Homecoming.mp3':
        case '/Inevitable.mp3':
        case '/Innocence.mp3':
        case '/LittleItaly.mp3':
        case '/Searching.mp3':
        case '/ShockAndAwe.mp3':
        case '/Suspicion.mp3':
        case '/WhatLurksInTheNight.mp3':
        case '/WhoAmI.mp3':
        case '/Forecasting.mp3':
            fs.readFile(__dirname + '/music/' + path, function (error, data) {
                if (error) {
                    res.writeHead(404);
                    res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                    res.end();
                }
                else {
                    res.writeHead(200, { "Content-Type": "text/mp3" });
                    res.write(data, "utf8");
                    res.end();
                }
            });
            break;
        case '/music.png':
        case '/nomusic.png':
            fs.readFile(__dirname + '/images/' + path, function (error, data) {
                if (error) {
                    res.writeHead(404);
                    res.write("<h1>Oops! This page doesn\'t seem to exist! 404</h1>");
                    res.end();
                }
                else {
                    res.writeHead(200, { "Content-Type": "text/png" });
                    res.write(data, "utf8");
                    res.end();
                }
            });
            break;
        default:
            res.writeHead(404);
            res.write('<title>404</title><h1>Oops! This page doesn\'t seem to exist! 404</h1>');
            res.end();
            break;
    }
});

var port = process.env.PORT || 8080;
server.listen(port, function () {
    console.log('Listening on port ' + port + '...');
});

io.listen(server);
io.sockets.on('connection', function (socket) {
    var IP = getIp(socket);
    if (IP_USER[IP]) {
        userlist[IP_USER[IP]].set('SOCKETID', socket.id);
        userlist[IP_USER[IP]].set('SOCKET', socket);
        userlist[IP_USER[IP]].set('IP', IP);
    }
    socket.on(Type.LOGINDEX, function (to, username, password) {
        if (to == 'toserver') {
            /*if (!userlist[username]) {
                console.log(`${IP}(${username}) logged in successfully!`);
                createUser(username);
                console.log(`${IP}(${username}) is now on INDEX`);
                IP_USER[IP] = username;
                socket.emit(Type.LOGINDEX, 'toclient', username, 'success');
            }
            else {
                console.log(`${IP} tried to login when already logged in!`);
                socket.emit(Type.LOGINDEX, 'toclient', username, 'alreadyin');
            }*/

            function sendrequest() {
                // Start the request
                request(options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        // Print out the response body
                        if (body.includes('title="Logout [ ' + username + ' ]"')) {
                            if (!userlist[username]) {
                                console.log(`${IP}(${username}) logged in successfully!`);
                                createUser(username);
                                console.log(`${IP}(${username}) is now on INDEX`);
                                IP_USER[IP] = username;
                                socket.emit(Type.LOGINDEX, 'toclient', username, 'success');
                            }
                            else {
                                console.log(`${IP} tried to login when already logged in!`);
                                socket.emit(Type.LOGINDEX, 'toclient', username, 'alreadyin');
                            }
                        }
                        else {
                            var captcha = body.substring(body.lastIndexOf("Spell this word backwards: ") + 27, body.lastIndexOf(":</label><br /><span>This"));
                            var captcharev = captcha.split("").reverse().join("");
                            var captchaconfirm = body.substring(body.lastIndexOf('id="qa_confirm_id" value="') + 26, body.lastIndexOf('id="qa_confirm_id" value="') + 58);
                            var sid = body.substring(body.lastIndexOf('name="sid" value="') + 18, body.lastIndexOf('name="sid" value="') + 50);
                            options.form.qa_answer = captcharev;
                            options.form.qa_confirm_id = captchaconfirm;
                            options.form.sid = sid;
                            request(options, function (error2, response2, body2) {
                                if (!error2 && response2.statusCode == 200) {
                                    // Print out the response body
                                    if (body2.includes('title="Logout [ ' + username + ' ]"')) {
                                        if (!userlist[username]) {
                                            console.log(`${IP}(${username}) logged in successfully!`);
                                            createUser(username);
                                            console.log(`${IP}(${username}) is now on INDEX`);
                                            IP_USER[IP] = username;
                                            socket.emit(Type.LOGINDEX, 'toclient', username, 'success');
                                        }
                                        else {
                                            console.log(`${IP} tried to login when already logged in!`);
                                            socket.emit(Type.LOGINDEX, 'toclient', username, 'alreadyin');
                                        }
                                    }
                                    else {
                                        console.log(`${IP} inserted a wrong username or password!`);
                                        socket.emit(Type.LOGINDEX, 'toclient', username, 'error');
                                    }
                                }
                            });
                        }
                    }
                });
            };

            var options = {
                url: 'http://www.blankmediagames.com/phpbb/ucp.php?mode=login',
                method: 'POST',
                headers: headers,
                form: { 'username': username, 'password': password, 'viewonline': 'on', 'redirect': 'http://www.blankmediagames.com/phpbb/index.php', 'sid': '872f8d72364f836d8d26be4df3d9fccc', 'login': 'Login' }
            }
            setTimeout(sendrequest, 0);
        }
    });
    socket.on(Type.LOGOUT, function (to) {
        if (to == 'toserver' && IP_USER[IP]) {
            console.log(`${IP}(${IP_USER[IP]}) has logged out!`);
            delete userlist[IP_USER[IP]];
            delete IP_USER[IP];
            socket.emit(Type.LOGOUT, 'toclient');
        }
    });
    socket.on(Type.JOINGAME, function (to, game) {
        if (to == 'toserver' && IP_USER[IP]) {
            switch (game) {
                case 'Automod':
                    var USERNAME = IP_USER[IP];
                    if (userlist[USERNAME].get('POSITION') == 'INGAME') {
                        socket.emit(Type.JOINGAME, 'toclient', 'error');
                    }
                    else if (howmanygameservers() == 0) {
                        var SERVERNAME = createGameServer('LOBBY', 'OFF');
                        userlist[IP_USER[IP]].set('POSITION', 'INGAME');
                        userlist[IP_USER[IP]].set('SERVER', SERVERNAME);
                        gameserverlist[SERVERNAME].set('MOD', false);
                        gameserverlist[SERVERNAME].add('PLAYER', USERNAME);
                        gameserverlist[SERVERNAME].set('HOST', USERNAME);
                        sendgameinfo(SERVERNAME);
                        socket.emit(Type.JOINGAME, 'toclient', 'success');
                    }
                    else {
                        var allfull = true;
                        for (var i in gameserverlist) {
                            if (gameserverlist[i].get('PHASE') == 'LOBBY') {
                                if (gameserverlist[i].get('PLAYERCOUNT') < 15 && gameserverlist[i].get('MOD') == false) {
                                    userlist[IP_USER[IP]].set('POSITION', 'INGAME');
                                    userlist[IP_USER[IP]].set('SERVER', i);
                                    gameserverlist[i].add('PLAYER', USERNAME);
                                    sendgameinfo(i);
                                    allfull = false;
                                    socket.emit(Type.JOINGAME, 'toclient', 'success');
                                    break;
                                }
                            }
                        }
                        if (allfull) {
                            var SERVERNAME = createGameServer('LOBBY', 'OFF');
                            userlist[IP_USER[IP]].set('POSITION', 'INGAME');
                            userlist[IP_USER[IP]].set('SERVER', SERVERNAME);
                            gameserverlist[SERVERNAME].set('MOD', false);
                            gameserverlist[SERVERNAME].add('PLAYER', USERNAME);
                            gameserverlist[SERVERNAME].set('HOST', USERNAME);
                            sendgameinfo(SERVERNAME);
                            socket.emit(Type.JOINGAME, 'toclient', 'success');
                        }
                    }
                    break;
                case 'Modded Game':
                    console.log('Modded Game.')
                    break;
                default:
                    socket.emit(Type.JOINGAME, 'toclient', 'notagame');
                    break;
            }
            //console.log(`${IP}(${IP_USER[IP]}) has logged out!`);
        }
    });
    /*function sendserverlist() {
        var list = '';
        for (i in gameserverlist) {
            if (list == '') {
                list += `${gameserverlist[i].get('PHASE')}|${gameserverlist[i].get('MOD')}|${gameserverlist[i].get('PLAYERS')}|${gameserverlist[i].get('PLAYERCOUNT')}|${gameserverlist[i].get('COUNT')}`;
            }
            else {
                list += `;${gameserverlist[i].get('PHASE')}|${gameserverlist[i].get('MOD')}|${gameserverlist[i].get('PLAYERS')}|${gameserverlist[i].get('PLAYERCOUNT')}|${gameserverlist[i].get('COUNT')}`;
            }
        }
        socket.emit(Type.SERVERLIST, list);
    };
    setInterval(sendserverlist, 1000);*/
    socket.on(Type.JOINPLAY, function () {
        if (IP_USER[IP]) {
            var SERVERNAME = userlist[IP_USER[IP]].get('SERVER');
            io.sockets.in(SERVERNAME).emit(Type.SYSTEM, `${IP_USER[IP]} has joined the game.`);
            socket.join(SERVERNAME);
            sendgameinfo(SERVERNAME);
            //socket.emit(Type.GAMEINFO, [gameserverlist[SERVERNAME].get('PLAYERS'), gameserverlist[SERVERNAME].get('PHASE'), gameserverlist[SERVERNAME].get('ROLELIST'), gameserverlist[SERVERNAME].get('HOST'), IP_USER[IP]]);
        }
    });
    socket.on(Type.PONG, function () {
        if (IP_USER[IP]) {
            userlist[IP_USER[IP]].set('PING', userlist[IP_USER[IP]].get('PINGTIME'));
        }
    });
    socket.on(Type.LOBBYACTION, function (action, value1, value2) {
        if (IP_USER[IP]) {
            var SERVERNAME = userlist[IP_USER[IP]].get('SERVER');
            switch (action) {
                case 'removerole':
                    if (gameserverlist[SERVERNAME].get('HOST') == IP_USER[IP]) {
                        gameserverlist[SERVERNAME].remove('ROLE', value1);
                        sendgameinfo(SERVERNAME);
                        //io.sockets.in(SERVERNAME).emit(Type.GAMEINFO, [gameserverlist[SERVERNAME].get('PLAYERS'), gameserverlist[SERVERNAME].get('PHASE'), gameserverlist[SERVERNAME].get('ROLELIST'), gameserverlist[SERVERNAME].get('HOST')]);
                    }
                    break;
                case 'addrole':
                    if (gameserverlist[SERVERNAME].get('HOST') == IP_USER[IP]) {
                        for (var i in roles.roles) {
                            for (var j in roles.roles[i]) {
                                if (j != 'name' && j != 'color' && j != 'id' && j != 'standard') {
                                    if (j == value1) {
                                        gameserverlist[SERVERNAME].add('ROLE', j);
                                        sendgameinfo(SERVERNAME);
                                        //io.sockets.in(SERVERNAME).emit(Type.GAMEINFO, [gameserverlist[SERVERNAME].get('PLAYERS'), gameserverlist[SERVERNAME].get('PHASE'), gameserverlist[SERVERNAME].get('ROLELIST'), gameserverlist[SERVERNAME].get('HOST')]);
                                    }
                                    else {
                                        for (var k in roles.roles[i][j]) {
                                            if (k != 'name' && k != 'color' && k != 'id' && k != 'standard') {
                                                if (k == value1) {
                                                    gameserverlist[SERVERNAME].add('ROLE', k);
                                                    sendgameinfo(SERVERNAME);
                                                    //io.sockets.in(SERVERNAME).emit(Type.GAMEINFO, [gameserverlist[SERVERNAME].get('PLAYERS'), gameserverlist[SERVERNAME].get('PHASE'), gameserverlist[SERVERNAME].get('ROLELIST'), gameserverlist[SERVERNAME].get('HOST')]);

                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    break;
                case 'leavelobby':
                    if (IP_USER[IP]) {
                        var USERNAME = IP_USER[IP];
                        var SERVERNAME = userlist[IP_USER[IP]].get('SERVER');
                        userlist[IP_USER[IP]].set('POSITION', 'LOBBY');
                        userlist[IP_USER[IP]].set('SERVER', false);
                        userlist[IP_USER[IP]].set('ROLE', false);
                        gameserverlist[SERVERNAME].remove('PLAYER', USERNAME);
                        if (gameserverlist[SERVERNAME].get('HOST') == USERNAME) {
                            if (gameserverlist[SERVERNAME].get('PLAYERCOUNT') < 1) {
                                console.log(`Server ${SERVERNAME} is empty. Deleting...`);
                                delete gameserverlist[SERVERNAME];
                            }
                            else {
                                gameserverlist[SERVERNAME].set('HOST', gameserverlist[SERVERNAME].get('PLAYERS')[0]);
                            }
                        }
                        try { sendgameinfo(SERVERNAME) } catch (err) { };
                        socket.emit(Type.LOBBYACTION, 'leavecomplete');
                        console.log(`${IP}(${USERNAME}) left Server ${SERVERNAME}`);
                        io.sockets.in(SERVERNAME).emit(Type.SYSTEM, `${IP_USER[IP]} has left the game.`);
                    }
                    break;
                case 'customon':
                    if (IP_USER[IP]) {
                        if (gameserverlist[SERVERNAME].get('HOST') == IP_USER[IP]) {
                            var USERNAME = IP_USER[IP];
                            var SERVERNAME = userlist[USERNAME].get('SERVER');
                            gameserverlist[SERVERNAME].set('CUSTOM', 'ON');
                            io.sockets.in(SERVERNAME).emit(Type.LOBBYACTION, 'customon');
                        }
                    }
                    break;
                case 'customoff':
                    if (IP_USER[IP]) {
                        if (gameserverlist[SERVERNAME].get('HOST') == IP_USER[IP]) {
                            let removed = false;
                            var USERNAME = IP_USER[IP];
                            var SERVERNAME = userlist[USERNAME].get('SERVER');
                            gameserverlist[SERVERNAME].set('CUSTOM', 'OFF');
                            var ROLELIST = gameserverlist[SERVERNAME].get('ROLELIST');
                            for (var i in ROLELIST) {
                                for (var j in roles.roles) {
                                    for (var k in roles.roles[j]) {
                                        if (k != 'name' && k != 'color' && k != 'id' && k != 'standard') {
                                            if (ROLELIST[i] == k) {
                                                if (!roles.roles[j][k].standard) {
                                                    gameserverlist[SERVERNAME].remove('ROLE', k);
                                                    removed = true;
                                                }
                                            }
                                            else {
                                                for (var l in roles.roles[j][k]) {
                                                    if (l != 'name' && l != 'color' && l != 'id' && l != 'standard') {
                                                        if (ROLELIST[i] == l) {
                                                            if (!roles.roles[j][k][l].standard) {
                                                                gameserverlist[SERVERNAME].remove('ROLE', l);
                                                                removed = true;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            io.sockets.in(SERVERNAME).emit(Type.LOBBYACTION, 'customoff');
                            if (removed) {
                                sendgameinfo(SERVERNAME);
                            }
                        }
                    }
                    break;
                case 'startgame':
                    if (IP_USER[IP]) {
                        if (gameserverlist[SERVERNAME].get('HOST') == IP_USER[IP]) {
                            var USERNAME = IP_USER[IP];
                            var SERVERNAME = userlist[IP_USER[IP]].get('SERVER');
                            if (gameserverlist[SERVERNAME].get('PLAYERCOUNT') > 0 && gameserverlist[SERVERNAME].get('PLAYERCOUNT') == gameserverlist[SERVERNAME].get('ROLELIST').length) {
                                gameserverlist[SERVERNAME].set('PHASE', 'PREPARING');
                                gameserverlist[SERVERNAME].set('TIMER', 50);
                                let ROLELIST = gameserverlist[SERVERNAME].get('ROLELIST');
                                let USED = new Array;
                                let USEDNUM = 0;
                                for (var i in ROLELIST) {
                                    USED[i] = false;
                                    USEDNUM++;
                                }
                                for (var i in ROLELIST) {
                                    function notusedrand() {
                                        let RAND = Math.floor((Math.random() * USEDNUM) + 1) - 1;
                                        if (USED[RAND]) {
                                            notusedrand();
                                        }
                                        else {
                                            USED[RAND] = true;
                                            return RAND;
                                        }
                                    }
                                    //If Role in Rolelist == Any
                                    if (ROLELIST[i] == 'any') {
                                        let NUMofROLES = 0;
                                        for (var j in roles.roles) {
                                            for (var k in roles.roles[j]) {
                                                if (k != 'name' && k != 'color' && k != 'id' && k != 'standard') {
                                                    for (var l in roles.roles[j][k]) {
                                                        if (l != 'name' && l != 'color' && l != 'id' && l != 'standard' && l != 'attributes') {
                                                            NUMofROLES++;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        let RANDO = Math.floor((Math.random() * NUMofROLES) + 1);
                                        let Counts = 0;
                                        for (var j in roles.roles) {
                                            for (var k in roles.roles[j]) {
                                                if (k != 'name' && k != 'color' && k != 'id' && k != 'standard') {
                                                    for (var l in roles.roles[j][k]) {
                                                        if (l != 'name' && l != 'color' && l != 'id' && l != 'standard' && l != 'attributes') {
                                                            Counts++;
                                                            if (Counts == RANDO) {
                                                                let PLAYERRAND = notusedrand();
                                                                console.log(`PLAYERRAND:${PLAYERRAND}|Players:${gameserverlist[SERVERNAME].get('PLAYERS')}|Player:${gameserverlist[SERVERNAME].get('PLAYERS')[PLAYERRAND]}`)
                                                                //userlist[gameserverlist[SERVERNAME].get('PLAYERS')[PLAYERRAND]].set('ROLE', l);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        for (var j in roles.roles) {
                                            for (var k in roles.roles[j]) {
                                                if (k != 'name' && k != 'color' && k != 'id' && k != 'standard') {
                                                    if (ROLELIST[i] == k) {
                                                        let NUMofROLES = 0;
                                                        for (var l in roles.roles[j][k]) {
                                                            if (l != 'name' && l != 'color' && l != 'id' && l != 'standard') {
                                                                NUMofROLES++;
                                                            }
                                                        }
                                                        let RANDO = Math.floor((Math.random() * NUMofROLES) + 1);
                                                        let Counts = 0;
                                                        for (var l in roles.roles[j][k]) {
                                                            if (l != 'name' && l != 'color' && l != 'id' && l != 'standard') {
                                                                Counts++;
                                                                if (Counts == RANDO) {
                                                                    let PLAYERRAND = notusedrand()
                                                                    console.log(`PLAYERRAND:${PLAYERRAND}|Players:${gameserverlist[SERVERNAME].get('PLAYERS')}|Player:${gameserverlist[SERVERNAME].get('PLAYERS')[PLAYERRAND]}`)
                                                                    //userlist[gameserverlist[SERVERNAME].get('PLAYERS')[PLAYERRAND]].set('ROLE', l);
                                                                }
                                                            }
                                                        }
                                                    }
                                                    else {
                                                        for (var l in roles.roles[j][k]) {
                                                            if (l != 'name' && l != 'color' && l != 'id' && l != 'standard') {
                                                                if (ROLELIST[i] == l) {
                                                                    let PLAYERRAND = notusedrand()
                                                                    console.log(`PLAYERRAND:${PLAYERRAND}|Players:${gameserverlist[SERVERNAME].get('PLAYERS')}|Player:${gameserverlist[SERVERNAME].get('PLAYERS')[PLAYERRAND]}`)
                                                                    //userlist[gameserverlist[SERVERNAME].get('PLAYERS')[PLAYERRAND]].set('ROLE', ROLELIST[i]);
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                io.sockets.in(SERVERNAME).emit(Type.LOBBYACTION, 'gamestart');
                                console.log(`A Game started on Server ${SERVERNAME} with ${gameserverlist[SERVERNAME].get('PLAYERCOUNT')} Players!`)
                                sendgameinfo(SERVERNAME);
                            }
                            else {
                                socket.emit(Type.SYSTEM, `The amount of selected roles must equal the amount of participating players. A game must also have more than two players (CURRENTLY DEACTIVATED).`)
                            }
                        }
                    }
                    break;
            }
        }
    });
    socket.on(Type.MSG, function (msg) {
        if (IP_USER[IP]) {
            msg = sanitize(msg);
            var SERVERNAME = userlist[IP_USER[IP]].get('SERVER');
            if (msg.length > 200) {
                socket.emit(Type.SYSTEM, 'Your message was too long.');
            }
            else if (msg.trim() == '') {
                socket.emit(Type.SYSTEM, 'Cannot send an empty message.');
            }
            else if (msg[0] == '/') {
                //COMMANDS
                var command = msg.split(" ")[0];
                command = command.slice(1);
                command = command.toLowerCase();

                var args = msg.split(" ").slice(1);
                var args = args.join(" ");

                switch (command) {
                    default:
                        socket.emit(Type.SYSTEM, 'Unknown Command. Type /help for help.');
                        break;
                    case 'repick':
                        if (gameserverlist[SERVERNAME].get('PHASE') == 'LOBBY') {
                            gameserverlist[SERVERNAME].add('REPICKCOUNT', 1);
                            if (gameserverlist[SERVERNAME].get('REPICKCOUNT') >= Math.ceil(gameserverlist[SERVERNAME].get('PLAYERCOUNT')/2)) {
                                let l = 0;
                                while (true) {
                                    if (l < 100) {
                                        let RAND = Math.floor((Math.random() * gameserverlist[SERVERNAME].get('PLAYERCOUNT')));
                                        if (gameserverlist[SERVERNAME].get('PLAYERS')[RAND] == gameserverlist[SERVERNAME].get('HOST')) {
                                            l++;
                                        }
                                        else {
                                            userlist[gameserverlist[SERVERNAME].get('HOST')].get('SOCKET').emit(Type.SYSTEM, `You are no longer the host.`);
                                            gameserverlist[SERVERNAME].set('HOST', gameserverlist[SERVERNAME].get('PLAYERS')[RAND]);
                                            io.sockets.in(SERVERNAME).emit(Type.SYSTEM, `The host has been repicked.`);
                                            break;
                                        }
                                    }
                                    else {
                                        console.error(`Could not repick host on Server ${SERVERNAME} after 100 Attempts!`);
                                        io.sockets.in(SERVERNAME).emit(Type.SYSTEM, `The Host could not be repicked! Please report this error to an adminstrator.`);
                                        break;
                                    }
                                }
                                gameserverlist[SERVERNAME].set('REPICKCOUNT', 0);
                                sendgameinfo(SERVERNAME);
                            }
                            else {
                                io.sockets.in(SERVERNAME).emit(Type.SYSTEM, `${Math.ceil(gameserverlist[SERVERNAME].get('PLAYERCOUNT') / 2) - gameserverlist[SERVERNAME].get('REPICKCOUNT')} more votes are needed to repick the host.`);
                            }
                        }
                        else {
                            socket.emit(Type.SYSTEM, `This command can only be used in the Lobby!`);
                        }
                        break;
                }
            }
            else {
                if (gameserverlist[SERVERNAME].get('PHASE') == 'LOBBY') {
                    io.sockets.in(SERVERNAME).emit(Type.MSG, `${IP_USER[IP]}: ${msg}`, 'msg');
                }
                else {
                    if (userlist[IP_USER[IP]].get('NICKNAME') == '') {
                        socket.emit(Type.SYSTEM, `Please choose a Name first!`);
                    }
                    else {
                        io.sockets.in(SERVERNAME).emit(Type.MSG, `${userlist[IP_USER[IP]].get('NICKNAME')}: ${msg}`, 'msg');
                    }
                }
            }
        }
    });
    socket.on(Type.GAMEACTION, function (action, value1, value2) {
        if (IP_USER[IP]) {
            var SERVERNAME = userlist[IP_USER[IP]].get('SERVER');
            let nameused = true;
            switch (action) {
                case 'setname':
                    for (var i in gameserverlist[SERVERNAME].get('PLAYERS')) {
                        if (userlist[gameserverlist[SERVERNAME].get('PLAYERS')[i]].get('NICKNAME') != value1) {
                            value1 = value1.replace(/\s/g, '');
                            if (value1.length < 17) {
                                if (value1 != '' && value1 != ' ') {
                                    if (!/^\d+$/.test(value1)) {
                                        userlist[IP_USER[IP]].set('NICKNAME', value1);
                                        io.sockets.in(SERVERNAME).emit(Type.SYSTEM, `${value1} has joined the Town.`);
                                    }
                                    else {
                                        socket.emit(Type.SYSTEM, `Your Name may not consist of just numbers!`);
                                    }
                                }
                                else {
                                    socket.emit(Type.SYSTEM, `Your Name may not be empty!`);
                                }
                            }
                            else {
                                socket.emit(Type.SYSTEM, `Your Name may not be longer than 16 Characters!`);
                            }
                            nameused = false;
                            break;
                        }
                    }
                    if (nameused) {
                        socket.emit(Type.SYSTEM, `This Name has already been used by someone else! Please choose a different one!`);
                    }
                    break;
            }
        }
    });
});

class User {
    constructor(POSITION, MOD) {
        this.__POSITION = POSITION;
        this.__MOD = MOD;
        this.__NICKNAME = '';
        this.__SERVER = false;
        this.__SOCKETID = '';
        this.__SOCKET = '';
        this.__PING = 0;
        this.__PINGATTEMPTS = 0;
        this.__PINGTIME = 0;
        this.__IP = '';
        this.__ROLE = false;
    }
    get(value) {
        switch (value) {
            case 'POSITION':
                return this.__POSITION;
            case 'NICKNAME':
                return this.__NICKNAME;
            case 'MOD':
                return this.__MOD;
            case 'SERVER':
                return this.__SERVER;
            case 'SOCKETID':
                return this.__SOCKETID;
            case 'SOCKET':
                return this.__SOCKET;
            case 'PING':
                return this.__PING;
            case 'PINGATTEMPTS':
                return this.__PINGATTEMPTS;
            case 'PINGTIME':
                return this.__PINGTIME;
            case 'IP':
                return this.__IP;
            case 'ROLE':
                return this.__ROLE;
            default:
                return false;
        }
    }
    set(value1, value2) {
        switch (value1) {
            case 'POSITION':
                this.__POSITION = value2;
                return true;
            case 'NICKNAME':
                this.__NICKNAME = value2;
                return true;
            case 'SERVER':
                this.__SERVER = value2;
                return true;
            case 'SOCKETID':
                this.__SOCKETID = value2;
                return true;
            case 'SOCKET':
                this.__SOCKET = value2;
                return true;
            case 'PING':
                this.__PING = value2;
                return true;
            case 'PINGATTEMPTS':
                this.__PINGATTEMPTS = value2;
                return true;
            case 'PINGTIME':
                this.__PINGTIME = value2;
                return true;
            case 'IP':
                this.__IP = value2;
                return true;
            case 'ROLE':
                this.__ROLE = value2;
                return true;
            default:
                return false;
        }
    }
};

class GameServer {
    constructor(PHASE, COUNT, CUSTOM) {
        this.__PHASE = PHASE;
        this.__MOD = undefined;
        this.__HOST = undefined;
        this.__PLAYERS = new Array;
        this.__ROLELIST = ['tpow', 'godfather'];
        this.__PLAYERCOUNT = 0;
        this.__ROLECOUNT = 2;
        this.__COUNT = COUNT;
        this.__TIMER = 0;
        this.__REPICKCOUNT = 0;
        this.__CUSTOM = CUSTOM;
    }
    get(value) {
        switch (value) {
            case 'PHASE':
                return this.__PHASE;
            case 'MOD':
                return this.__MOD;
            case 'HOST':
                return this.__HOST;
            case 'PLAYERS':
                return this.__PLAYERS;
            case 'ROLELIST':
                return this.__ROLELIST;
            case 'PLAYERCOUNT':
                return this.__PLAYERCOUNT;
            case 'COUNT':
                return this.__COUNT;
            case 'TIMER':
                return this.__TIMER;
            case 'REPICKCOUNT':
                return this.__REPICKCOUNT;
            case 'CUSTOM':
                return this.__CUSTOM;
            default:
                return false;
        }
    }
    set(value1, value2) {
        switch (value1) {
            case 'PHASE':
                this.__PHASE = value2;
                return true;
            case 'MOD':
                this.__MOD = value2;
                return true;
            case 'HOST':
                this.__HOST = value2;
                return true;
            case 'COUNT':
                this.__COUNT = value2;
                return true;
            case 'TIMER':
                this.__TIMER = value2;
                return true;
            case 'REPICKCOUNT':
                this.__REPICKCOUNT = value2;
                return true;
            case 'CUSTOM':
                this.__CUSTOM = value2;
                return true;
            default:
                return false;
        }
    }
    add(value1, value2) {
        switch (value1) {
            case 'PLAYER':
                this.__PLAYERS[this.__PLAYERCOUNT] = value2;
                this.__PLAYERCOUNT++;
                break;
            case 'ROLE':
                if (this.__ROLECOUNT < 15) {
                    this.__ROLELIST[this.__ROLECOUNT] = value2;
                    this.__ROLECOUNT++;
                }
                break;
            case 'REPICKCOUNT':
                this.__REPICKCOUNT = this.__REPICKCOUNT + value2;
        }
    }
    remove(value1, value2) {
        switch (value1) {
            case 'PLAYER':
                this.__PLAYERS.splice(this.__PLAYERS.indexOf(value2), 1);
                this.__PLAYERCOUNT--;
                break;
            case 'ROLE':
                if (this.__ROLECOUNT > 0) {
                    //this.__ROLELIST.splice(value2 - 1, 1);
                    this.__ROLELIST.splice(this.__ROLELIST.indexOf(value2), 1);
                    this.__ROLECOUNT--;
                }
                break;
        }
    }
};

/*for (var i = 0; i < 10; i++) {
    createGameServer('Lobby');
}
var j = 0;
var element = ''
for (i in gameserverlist) {
    if (j == 2) {
        element = i;
        break;
    }
    j++;
}


gameserverlist[element].add('PLAYER', 'A');
gameserverlist[element].add('PLAYER', 'BZ');
gameserverlist[element].add('PLAYER', 'EG');
gameserverlist[element].remove('PLAYER', 'BZ');*/

/*var result = 0;
for (var a in gameserverlist) {
    if (gameserverlist.hasOwnProperty(a)) {
        // or Object.prototype.hasOwnProperty.call(obj, prop)
        result++;
    }
}
console.log(result);*/