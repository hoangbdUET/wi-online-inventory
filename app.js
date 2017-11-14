"use strict";
let models = require('./models/index');
let User = models.User;
let md5 = require('md5');
addUser();

function addUser() {
    let Admin = {
        username: "admin",
        password: md5('1'),
        role: "1"
    }
    User.findOrCreate({where: {username: "admin"}, defaults: Admin}).then(() => {
        main();
    }).catch();
}


function main() {
    var express = require('express');
    var config = require('config').Application;
    var app = express();
    const cors = require('cors');
    var http = require('http').Server(app);
    app.use(cors());

    let bodyParser = require('body-parser');
    app.use(bodyParser.json());

    let authentication = require('./router/authenticate');
    app.use('/', authentication.router);
    app.use(authentication.authenticate());

    let testRouter = require('./router/index');
    let curveRouter = require('./router/curve/curveRouter');
    let wellRouter = require('./router/well/wellRouter');
    let uploadRouter = require('./router/upload/las-file');
    let fileRouter = require('./router/file/fileRouter');
    let userRouter = require('./router/user/userRouter');


    app.use('/', testRouter);
    app.use('/', userRouter);
    app.use('/user', fileRouter);
    app.use('/user/file', wellRouter);
    app.use('/user/file/well', curveRouter);
    app.use('/', uploadRouter);
    app.get('/', function (req, res) {
        res.status(200).send('WI Online Inventory');
    });
    app.use(function (req, res, next) {
        res.status(404).send("NOT FOUND ROUTER");
    });
    app.listen(config.port, function () {
        console.log('Listening on port : ' + config.port);
    })
}