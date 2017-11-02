"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let File = models.File;
let response = require('../response');

router.use(bodyParser.json());

router.post('/file/new', function (req, res) {
    File.create(req.body).then(file => {
        res.send(response(200, 'SUCCESSFULLY CREATE NEW FILE', file));
    }).catch(err => {
        res.send(response(500, 'FAILED TO CREATE NEW FILE', err));
    });
});

router.post('/file/info', function (req, res) {
    console.log(req.body);
    File.findOne({
        where: {
            idFile: req.body.idFile,
            idUser:req.decoded.idUser
        }
    }).then(file => {
        if (file) {
            res.send(response(200, 'SUCCESSFULLY GET FILE INFOR', file));
        } else {
            res.send(response(200, "NO FILE FOUND BY ID"));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND FILE', err));
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
                res.send(response(200, 'SUCCESSFULLY EDIT FILE', c));
            }).catch(err => {
                res.send(response(500, 'FAILED TO EDIT FILE', err));
            })
        } else {
            res.send(response(500, "NO FILE FOUND FOR EDIT"));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND FILE', err));
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
            res.send(response(200, 'SUCCESSFULLY DELETE FILE', file));
            //be sure to detele all curves of file on disk
        } else {
            res.send(response(500, "NO FILE FOUND FOR DELETE"));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND FILE', err));
    });
});

router.post('/files', function (req, res) {
    File.findAll({
        where: {
            idUser: req.decoded.idUser
        }
    })
        .then((files) => {
            res.send(response(200, 'SUCCESSFULLY GET FILES', files));
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO GET FILES', err));
        })
})


module.exports = router;
