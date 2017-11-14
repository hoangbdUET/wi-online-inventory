const express = require('express');
const router = express.Router();
var bodyParser = require('body-parser');
var User = require('../models').User;
var jwt = require('jsonwebtoken');
var md5 = require('md5');
let response = require('./response');

router.use(bodyParser.json());

router.post('/login', function (req, res) {
    User.findOne({where: {username: req.body.username}})
        .then(function (user) {
            if (!user) {
                res.send(response(401, 'USER DOES NOT EXISTS'));
            } else {
                console.log(user.password + '       ' + md5(req.body.password));
                if (user.password != md5(req.body.password)) {
                    res.send(response(401, 'Wrong password. Authenticate fail'));
                } else {
                    var token = jwt.sign(req.body, 'secretKey');
                    res.send(response(200, 'SUCCEEDED', {token: token}))
                }
            }
        });
});

function authenticate() {
    return function (req, res, next) {
        var token = req.body.token || req.query.token || req.headers['x-access-token'] || req.get('Authorization');
        if (token) {
            jwt.verify(token, 'secretKey', function (err, decoded) {
                if (err) {
                    return res.send(response(401, 'Failed to authenticate'));
                } else {
                    User.findOne({
                        where: {
                            username: decoded.username
                        }
                    }).then((user) => {
                        req.decoded = {};
                        req.decoded.idUser = user.idUser;
                        next();
                    })

                }
            });

        } else {
            return res.status(401).send(response(401, 'No token provided' ,{
                code: 401,
                success: false,
                message: 'No token provided.'
            }))
        }
    }
}

module.exports = {
    router : router,
    authenticate : authenticate
}
