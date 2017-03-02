"use strict";

var http = require('http');
var url = require('url');
var fs = require('fs');
var IP_USER = new Array;
var userlist = new Array;
var express = require('express');
var session = require('express-session');
var Server = require('socket.io');
var request = require('request');
var io = new Server(http, { pingInterval: 5000, pingTimeout: 10000 });

var headers = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
}

//Enums
var Type = {
    LOGINDEX: 0,
    LOGOUT: 1
};

function getIp(socket) {
    return (socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address || '::1');
}
function getIpReq(req) {
    return (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress);
}
function createUser(USERNAME) {
    userlist[USERNAME] = new User('INDEX');
}

var server = http.createServer(function (req, res) {
    var IP_REQ = getIpReq(req);
    var path = url.parse(req.url).pathname;
    //Routing
    switch (path) {
        case '/':
            if (IP_USER[IP_REQ]) {
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
        case '/lobby.js':
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
        case '/index.css':
        case '/lobby.css':
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
        default:
            res.writeHead(404);
            res.write('<h1>Oops! This page doesn\'t seem to exist! 404</h1>');
            res.end();
            break;
    }
});

var port = process.env.PORT || 8080;
server.listen(port, function () {
    console.log('Listening on port ' + port + '...');
});

io.listen(server);
io.on('connection', function (socket) {
    var IP = getIp(socket);
    socket.on(Type.LOGINDEX, function (to, username, password) {
        if (to == 'toserver') {

            function sendrequest() {
                // Start the request
                request(options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        // Print out the response body
                        if (body.includes('title="Logout [ ' + username + ' ]"')) {
                            console.log(`${IP}(${username}) logged in successfully!`);
                            createUser(username);
                            console.log(`${IP}(${username}) is now on INDEX`);
                            IP_USER[IP] = username;
                            socket.emit(Type.LOGINDEX, 'toclient', username, 'success');
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
                                        console.log(`${IP}(${username}) logged in successfully!`);
                                        createUser(username);
                                        console.log(`${IP}(${username}) is now on INDEX`);
                                        IP_USER[IP] = username;
                                        socket.emit(Type.LOGINDEX, 'toclient', username, 'success');
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
    socket.on(Type.LOGOUT, function (to, username) {
        if (to == 'toserver') {
            delete IP_USER[IP];
            delete userlist[username];
            console.log(`${IP}(${username}) has logged out!`);
            socket.emit(Type.LOGOUT, 'toclient', username);
        }
    });
});

class User {
    constructor(POSITION) {
        this.__POSITION = POSITION;
        this.__NICKNAME = '';
    }
    get(value) {
        switch (value) {
            case 'POSITION':
                return this.__POSITION;
            case 'NICKNAME':
                return this.__NICKNAME;
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
            default:
                return false;
        }
    }
};