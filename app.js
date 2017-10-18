"use strict";
main();

function main() {
    var express = require('express')
    var app = express()
    const cors = require('cors');
    var http = require('http').Server(app);
    app.use(cors());
    var config = require('./config.json').Application;
    let testRouter = require('./router/index');
    let curveRouter = require('./router/curve/curveRouter');
    let wellRouter = require('./router/well/wellRouter');


    app.use('/', testRouter);
    app.use('/', wellRouter);
    app.use('/well', curveRouter);
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