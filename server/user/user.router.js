"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../models/index');
let User = models.User;
let response = require('../response');

router.use(bodyParser.json());

router.post('/user/info', function (req, res) {
    User.findById(req.decoded.username).then(user => {
        if (user) {
            res.send(response(200, 'GET USER INFOR SUCCESS', user));
        } else {
            res.send(response(200, 'NO USER FOUND BY ID'));
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/user/fullinfo', function (req, res) {
    User.findOne({
        where: {username: req.decoded.username},
        include: {all: true, include: {all: true, include: {all: true}}}
    }).then(rs => {
        res.send(response(200, 'Successful', rs));
    });
});

module.exports = router;