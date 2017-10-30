"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let Well = models.Well;
let File = models.File;
let User = models.User;

router.use(bodyParser.json());


router.post('/well/new', function (req, res) {
    Well.create(req.body).then(well => {
        res.status(200).send(well);
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/well/info', function (req, res) {
    Well.findOne({
        where:{idWell : req.body.idWell},
        include : {
            model: File,
            attributes: [],
            include : [ {
                model: User,
                attributes: [],
                where: { idUser : req.decoded.idUser},
                required: true
            }],
            required : true
        },
        logging: console.log
    }).then(well => {
        if (well) {
            res.status(200).send(well);
        } else {
            res.status(200).send("NO well FOUND BY ID");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/well/edit', function (req, res) {
    Well.findById(req.body.idWell, {
        include : {
            model: File,
            attributes: [],
            include : [ {
                model: User,
                attributes: [],
                where: { idUser : req.decoded.idUser},
                required: true
            }],
            required : true
        },
        logging: console.log
    }).then(well => {
        if (well) {
            Object.assign(well, req.body);
            well.save().then(c => {
                res.status(200).send(c);
            }).catch(e => {
                res.status(500).send("ERR");
            })
        } else {
            res.status(200).send("NO CURVE FOUND FOR EDIT");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/well/delete', function (req, res) {
    Well.destroy({
        where: {
            idWell: req.body.idWell
        },
        include : {
            model: File,
            attributes: [],
            include : [ {
                model: User,
                attributes: [],
                where: { idUser : req.decoded.idUser},
                required: true
            }],
            required : true
        }
    }).then(well => {
        if (well) {
            res.status(200).send(well);
        } else {
            res.status(500).send("NO well FOUND FOR DELETE");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/wells', function (req, res) {
    Well.findAll({
        where: {
            idFile: req.body.idFile,
         },
        include : [{
            model: File,
            attributes: [],
            where : { idFile: req.body.idFile },
            include : [ {
                model: User,
                attributes: [],
                where: { idUser : req.decoded.idUser}
            }]
        }]
    })
        .then((files) => {
            res.status(200).send(files);
        })
        .catch((err) => {
            res.status(500).send(err);
        })
})

module.exports = router;
