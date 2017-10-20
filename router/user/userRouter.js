"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let User = models.User;

router.use(bodyParser.json());

router.post('/user/new', function (req, res) {
    User.create(req.body).then(user => {
        res.status(200).send(user);
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/user/info', function (req, res) {
    User.findById(req.body.idUser, {include: {all: true, include: {all: true, include: {all: true}}}}).then(user => {
        if (user) {
            res.status(200).send(user);
        } else {
            res.status(200).send("NO USER FOUND BY ID");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/user/edit', function (req, res) {
    User.findById(req.body.idUser).then(user => {
        if (user) {
            Object.assign(user, req.body);
            user.save().then(c => {
                res.status(200).send(c);
            }).catch(e => {
                res.status(500).send("ERR");
            })
        } else {
            res.status(200).send("NO USER FOUND FOR EDIT");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/file/delete', function (req, res) {
    User.destroy({
        where: {
            idUser: req.body.idUser
        }
    }).then(user => {
        if (user) {
            res.status(200).send(user);
        } else {
            res.status(500).send("NO USER FOUND FOR DELETE");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

module.exports = router;
