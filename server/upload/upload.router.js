'use strict';
const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadModel = require('./upload.model');
const responseJSON = require('../response');

let storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

let upload = multer({storage: storage});

router.post('/upload/lases', upload.array('file'), function(req, res) {
    uploadModel
        .uploadLasFiles(req)
        .then(result => {
            res.send(responseJSON(200, 'UPLOAD FILES SUCCESS', result));
        })
        .catch(err => {
            res.send(responseJSON(500, 'UPLOAD FILES FAILED', err));
        });
});

router.post('/upload/ascii', upload.array('file'), function(req, res) {
    uploadModel.uploadAsciiFiles(req, (err, result) => {
        if (err) res.send(responseJSON(500, 'UPLOAD FILES FAILED', err));
        else res.send(responseJSON(200, 'UPLOAD FILES SUCCESS', result));
    });
});

router.post('/upload/coredata', upload.array('file'), function(req, res) {
    uploadModel.uploadFiles(req, (err, result) => {
        if (err) res.send(responseJSON(500, 'UPLOAD FILES FAILED', err));
        else res.send(responseJSON(200, 'UPLOAD FILES SUCCESS', result));
    });
});

router.post('/upload/csv', upload.array('file'), function(req, res) {
    uploadModel
        .uploadCSVFile(req)
        .then(result => {
            res.send(responseJSON(200, 'UPLOAD FILES SUCCESS', result));
        })
        .catch(err => {
            res.send(responseJSON(500, 'UPLOAD FILES FAILED', err));
        });
});

module.exports = router;
