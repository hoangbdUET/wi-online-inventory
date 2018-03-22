"use strict";
let models = require('./models/index');
let User = models.User;
let md5 = require('md5');
let path = require('path');
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
    require('http').Server(app);
    app.use(cors());

    let bodyParser = require('body-parser');
    app.use(bodyParser.json());
    app.use('/exports', express.static(path.join(__dirname, 'exports')));
    

    let authentication = require('./controllers/authenticate');
    app.use('/', authentication.router);
    app.use(authentication.authenticate());

    let testRouter = require('./controllers/index');
    let curveRouter = require('./controllers/curve/curveRouter');
    let wellRouter = require('./controllers/well/wellRouter');
    let uploadRouter = require('./controllers/upload/uploadRouter');
    let userRouter = require('./controllers/user/userRouter');
    let datasetRouter = require('./controllers/dataset/datasetRouter');
    let exportRouter = require('./export/exportRouter');

    app.use('/', testRouter);
    app.use('/', userRouter);
    app.use('/user', wellRouter);
    app.use('/user/well', datasetRouter);
    app.use('/user/well/dataset', curveRouter);
    app.use('/', uploadRouter);
    app.use('/export', exportRouter);
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