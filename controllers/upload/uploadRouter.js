"use strict";

var express = require("express");
var router = express.Router();
var multer = require('multer');
let response = require('../response');
const lasProcessing = require('./lasProcessing');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

let upload = multer({storage: storage});

router.post('/upload/lases', upload.array('file'), function (req, res)  {
    lasProcessing.uploadLasFiles(req, (err, result) =>{
        if(err) res.send(response(500, 'UPLOAD FILES FAILED', err));
        else res.send(response(200, 'UPLOAD FILES SUCCESS', result));
    })
})

module.exports = router;