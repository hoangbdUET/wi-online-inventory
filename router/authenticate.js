const express = require('express');
const router = express.Router();
var bodyParser = require('body-parser');
var User = require('../models').User;
var jwt = require('jsonwebtoken');

router.use(bodyParser.json());
router.post('/login', function (req, res) {
    User.findOne({where: {idUser: req.body.idUser}})
        .then(function (user) {
            if (!user) {
                res.status(401).send("User not exist");
            } else {
                if (user.password != req.body.password) {
                    res.status(401).send("Wrong password. Authenticate fail");
                } else {
                    var token = jwt.sign(req.body, 'secretKey');
                    res.status(200).send({status:"Success", token: token});
                }
            }
        });
});


function authenticate() {
    return function (req, res, next) {
        console.log(req.headers);
        var token = req.body.token || req.query.token || req.headers['x-access-token'] || req.get('Authorization');
        if (token) {
            jwt.verify(token, 'secretKey', function (err, decoded) {
                if (err) {
                    return res.status(401).json({code: 401, success: false, message: 'Failed to authenticate'});
                } else {
                    req.decoded = decoded;
                    next();
                }
            });

        } else {
            return res.status(401).send({
                code: 401,
                success: false,
                message: 'No token provided.'
            })
        }
    }
}

module.exports = {
    router : router,
    authenticate : authenticate
}