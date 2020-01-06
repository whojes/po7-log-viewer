const msgType = require("./msgType").msgType;
const status = require("./msgType").status;

const CLIENT_PORT = 6754;
const WEBSOCKER_PROXY_PORT = 16754;

const express = require('express');
const SshClient = require('ssh2').Client;
const fs = require('fs');

const WebSocketServer = require("websocket").server;
const http = require('http');

// webserver
const web = express();
web.use(express.static('html'));
web.use((req, res, next) => {
    fs.readFile("./html/index.html", (err, data) => {
        if (err) {
            console.error(err.message);
        } else {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.write(data);
            res.end();
        }
    });
});
const webserver = http.createServer(web);
webserver.listen(CLIENT_PORT);

// websocket server
const server = http.createServer();
const wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on('request', function (request) {
    const connection = request.accept(null, request.origin);
    let ssh;
    let tailingFiles = {};
    connection.on('message', (message) => {
        if (message.type !== 'utf8') {
            connection.sendUTF(JSON.stringify({ status: status.FAIL, message: "UTF8을 사용합시다!" }));
            return;
        }
        const msg = JSON.parse(message.utf8Data);
        switch (msg.msgType) {
            case msgType.HANDSHAKE:
                ssh = new SshClient();
                ssh.on('ready', () => {
                    connection.sendUTF(JSON.stringify({ type: msgType.HANDSHAKE, status: status.SUCCESS }));
                }).on('error', (err) => {
                    connection.sendUTF(JSON.stringify({ type: msgType.HANDSHAKE, status: status.FAIL, message: "SSH CONNECTION FAILED. \n" + err }));
                }).connect({
                    host: msg.message.ip,
                    port: 22,
                    username: msg.message.user,
                    password: msg.message.pwd
                });
                break;

            case msgType.FILEREAD:
                ssh.exec(`ls -l ${msg.filepath}`, (err, stream) => {
                    if (err) {
                        connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.FAIL, filepath: msg.filepath, error: err }));
                        return;
                    }
                    stream.on('data', (data) => {
                        let stdout = data.toString();
                        let fileSize;
                        if (stdout.includes(msg.filepath)) {
                            fileSize = stdout.split(" ")[4];
                        } else {
                            connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.FAIL, filepath: msg.filepath, error: `File not Exists: ${msg.filepath}` }));
                            return;
                        }
                        if (fileSize > 5000000) {
                            connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.FAIL, filepath: msg.filepath, error: `File Size is Too Big: \n${msg.filepath} size: ${fileSize / 1048576} megabytes\nYou can only get last 10000 lines of the file.` }));
                            ssh.exec(`tail -n10000 ${msg.filepath}`, (err, stream) => {
                                let filename = msg.filepath.split("/").pop();
                                if (err) {
                                    connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.FAIL, filepath: msg.filepath, error: err }));
                                    return;
                                }
                                stream.on('close', (code, signal) => {
                                    connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.SUCCESS, filepath: msg.filepath, code: code, signal: signal }));
                                }).on('data', (data) => {
                                    connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.SUCCESS, filepath: msg.filepath, stdout: data.toString() }));
                                }).stderr.on('data', (data) => {
                                    connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.SUCCESS, filepath: msg.filepath, stderr: data.toString() }));
                                });
                            });
                            return;
                        }

                        ssh.exec(`cat ${msg.filepath}`, (err, stream) => {
                            if (err) {
                                connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.FAIL, filepath: msg.filepath, error: err }));
                                return;
                            }
                            stream.on('close', (code, signal) => {
                                connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.SUCCESS, filepath: msg.filepath, code: code, signal: signal }));
                            }).on('data', (data) => {
                                connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.SUCCESS, filepath: msg.filepath, stdout: data.toString() }));
                            }).stderr.on('data', (data) => {
                                connection.sendUTF(JSON.stringify({ type: msgType.FILEREAD, status: status.SUCCESS, filepath: msg.filepath, stderr: data.toString() }));
                            });
                        });
                    })
                });

                break;

            case msgType.FILETAIL:
                let filename = msg.filepath.split("/").pop();
                if (tailingFiles[msg.filepath]) {
                    connection.sendUTF(JSON.stringify({ type: msgType.FILETAIL, status: status.FAIL, filepath: msg.filepath, error: `already reading the file ${filename}...` }));
                    break;
                }

                ssh.exec(`tail -f -n0 ${msg.filepath}`, (err, stream) => {
                    if (err) {
                        connection.sendUTF(JSON.stringify({ type: msgType.FILETAIL, status: status.FAIL, filepath: msg.filepath, error: err }));
                        return;
                    }
                    stream.on('close', (code, signal) => {
                        connection.sendUTF(JSON.stringify({ type: msgType.FILETAIL, status: status.SUCCESS, filepath: msg.filepath, code: code, signal: signal }));
                    }).on('data', (data) => {
                        connection.sendUTF(JSON.stringify({ type: msgType.FILETAIL, status: status.SUCCESS, filepath: msg.filepath, stdout: data.toString() }));
                    }).stderr.on('data', (data) => {
                        connection.sendUTF(JSON.stringify({ type: msgType.FILETAIL, status: status.SUCCESS, filepath: msg.filepath, stderr: data.toString() }));
                    });
                    tailingFiles[msg.filepath] = stream;
                });
                break;

            case msgType.FILETAILKILL:
                if (tailingFiles[msg.filepath]) {
                    tailingFiles[msg.filepath].close()
                    delete tailingFiles[msg.filepath];
                    connection.sendUTF(JSON.stringify({ type: msgType.FILETAILKILL, status: status.SUCCESS, filepath: msg.filepath }));
                } else {
                    connection.sendUTF(JSON.stringify({ type: msgType.FILETAILKILL, status: status.SUCCESS, filepath: msg.filepath, message: "already closed stream." }));
                }
                break;

            case msgType.INSPECTPOHOME:
                ssh.exec(msg.command, (err, stream) => {
                    if (err) {
                        connection.sendUTF(JSON.stringify({ type: msg.msgType, status: status.FAIL, error: err }));
                        return;
                    }
                    stream.on('close', (code, signal) => {
                        connection.sendUTF(JSON.stringify({ type: msg.msgType, status: status.SUCCESS, code: code, signal: signal }));
                    }).on('data', (data) => {
                        connection.sendUTF(JSON.stringify({ type: msg.msgType, status: status.SUCCESS, stdout: data.toString() }));
                    }).stderr.on('data', (data) => {
                        connection.sendUTF(JSON.stringify({ type: msg.msgType, status: status.SUCCESS, stderr: data.toString() }));
                    });
                });
                break;

            case msgType.SHOWFILELIST:
                ssh.exec(`find ${msg.podirectory}/logs/ -name "*.log"`, (err, stream) => {
                    if (err) {
                        connection.sendUTF(JSON.stringify({ type: msg.msgType, status: status.FAIL, error: err }));
                        return;
                    }
                    stream.on('close', (code, signal) => {
                        connection.sendUTF(JSON.stringify({ type: msg.msgType, status: status.SUCCESS, code: code, signal: signal }));
                    }).on('data', (data) => {
                        connection.sendUTF(JSON.stringify({ type: msg.msgType, status: status.SUCCESS, stdout: data.toString() }));
                    }).stderr.on('data', (data) => {
                        connection.sendUTF(JSON.stringify({ type: msg.msgType, status: status.SUCCESS, stderr: data.toString() }));
                    });
                });
                break;
            default:
                break;
        }
    });
    connection.on('close', () => {
        Object.keys(tailingFiles).forEach(key => {
            tailingFiles[key].close();
            delete tailingFiles[key];
        });
    });
});

server.listen(WEBSOCKER_PROXY_PORT);