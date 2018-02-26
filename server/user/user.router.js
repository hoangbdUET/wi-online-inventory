"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../models/index');
let User = models.User;
let response = require('../response');

router.use(bodyParser.json());

router.post('/user/fullinfo', function (req, res) {
    User.findOne({
        where: {username: req.decoded.username},
        include: {all: true, include: {all: true, include: {all: true}}}
    }).then(rs => {
        res.send(response(200, 'Successful', rs));
    });
});

module.exports = router;