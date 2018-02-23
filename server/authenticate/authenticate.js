"use strict";

const configApp = require('config').Application;
const User = require('../models').User;
const jwt = require('jsonwebtoken');
let responseJSON = require('../response');

module.exports = function authenticate() {
    return function (req, res, next) {
        let token = req.body.token || req.query.token || req.headers['x-access-token'] || req.get('Authorization');
        if (token) {
            jwt.verify(token, configApp.jwtSecretKey, function (err, decoded) {
                if (err) {
                    return res.status(401).send(responseJSON(401, 'Failed to authenticate'));
                } else {
                    User.findOne({
                        where: {
                            username: decoded.username
                        }
                    }).then((user) => {
                        if (user) {
                            req.decoded = user.toJSON();
                            next();
                        } else {
                            User.create({
                                username: decoded.username,
                                password: '========================================'
                            }).then(user => {
                                req.decoded = user.toJSON();
                                next();
                            }).catch(err => {
                                return res.status(401).send(responseJSON(401, 'Failed to authenticate'));
                            });
                        }
                    });
                }
            });
        } else {
            return res.status(401).send(responseJSON(401, 'No token provided'));
        }
    }
}