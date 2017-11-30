"use strict";
var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.json());

router.get('/get', function (req, res) {
    res.status(200).send("Hello World");
});
router.post('/post', function (req, res) {
    console.log(req.body.id);
    res.status(200).send("Hello: " + req.body.id);
});
router.delete('/delete', function (req, res) {

});
router.put('/put', function (req, res) {

});
module.exports = router;