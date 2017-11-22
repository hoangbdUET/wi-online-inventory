"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let User = models.User;
let response = require('../response');

router.use(bodyParser.json());

router.post('/user/new', function (req, res) {
    User.create(req.body).then(user => {
        res.send(response(200, 'SUCCESSFULLY CREATE NEW USER', user));
    }).catch(err => {
        res.send(response(500, 'FAILED TO CREATE NEW USER', err));
    });
});

router.post('/user/info', function (req, res) {
    User.findById(req.decoded.idUser).then(user => {
        if (user) {
            res.send(response(200, 'GET USER INFOR SUCCESS', user));
        } else {
            res.send(response(200, 'NO USER FOUND BY ID'));
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/user/edit', function (req, res) {
    User.findById(req.decoded.idUser).then(user => {
        if (user) {
            Object.assign(user, req.body);
            user.save().then(c => {
                res.send(response(200, 'USER EDITED', c));
            }).catch(e => {
                res.send(response(500, 'USER EDIT FAILED', e));
            })
        } else {
            res.send(response(500, 'NO USER FOUND BY ID'));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND USER', err));
    });
});

router.post('/user/delete', function (req, res) {
    User.destroy({
        where: {
            idUser: req.decoded.idUser
        }
    }).then(user => {
        if (user) {
            res.send(response(200, 'USER DELETE SUCCESS'));
        } else {
            res.send(response(500, "NO USER FOUND FOR DELETE"));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND USER', err));
    });
});

module.exports = router;
