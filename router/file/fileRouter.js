"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let File = models.File;
let User = models.User;
let Well = models.Well;

router.use(bodyParser.json());

router.post('/file/new', function (req, res) {
    File.create(req.body).then(file => {
        res.status(200).send(file);
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/file/info', function (req, res) {
    console.log(req.body);
    File.findOne({
        where: {
            idFile: req.body.idFile,
            idUser:req.decoded.idUser
        },
        // include: {Well, include: {all: true}}
        include: [{model: Well, include: {all : true}}  ]
    }).then(file => {
        if (file) {
            res.status(200).send(file);
        } else {
            res.status(200).send("NO FILE FOUND BY ID");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/file/edit', function (req, res) {
    File.findOne({
        where: {
            idFile: req.body.idFile,
            idUser: req.decoded.idUser
        }}).then(file => {
        if (file) {
            Object.assign(file, req.body);
            file.save().then(c => {
                res.status(200).send(c);
            }).catch(err => {
                res.status(500).send(err);
            })
        } else {
            res.status(200).send("NO FILE FOUND FOR EDIT");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/file/delete', function (req, res) {
    File.destroy({
        where: {
            idUser: req.decoded.idUser,
            idFile: req.body.idFile
        }
    }).then(file => {
        if (file) {
            res.status(200).send(file);
        } else {
            res.status(500).send("NO FILE FOUND FOR DELETE");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/files', function (req, res) {
    File.findAll({
        where: {
            idUser: req.decoded.idUser
            // idUser: req.idUser
        }
    })
        .then((files) => {
            res.status(200).send(files);
        })
        .catch((err) => {
            res.status(500).send(err);
        })
})


module.exports = router;
