"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../models/index');
let User = models.User;
let response = require('../response');
let asyncEach = require('async/each');

router.use(bodyParser.json());

router.post('/user/info', function (req, res) {
    User.findByPk(req.decoded.username).then(user => {
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
    let finalResponse = {};
    User.findOne({
        where: {username: req.decoded.username},
        include: {all: true}
    }).then(rs => {
        finalResponse = rs.toJSON();
        asyncEach(finalResponse.wells, function (well, nextWell) {
            models.Dataset.findAll({where: {idWell: well.idWell}, include: {model: models.Curve}}).then(datasets => {
                well.datasets = datasets;
                nextWell();
            });
        }, function () {
            res.send(response(200, 'Successful', finalResponse));
        });

    });
});

module.exports = router;