var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
let config = require('config');
var byline = require('byline');
var models = require('../models');
var Well = models.Well;
var async = require('async');

router.get('/wells', function (req, res) {
    Well.findAll({
        include: [{
            model: models.WellHeader
        }, {
            model: models.Dataset,
            include: {
                model: models.Curve
            }
        }]
    }).then(wells => {
        res.send(wells);
    })
})
router.get('/:wellid', function (req, res) {
    Well.findById(req.params.wellid, {
        include: [{
            model: models.WellHeader
        }, {
            model: models.Dataset,
            include: {
                model: models.Curve
            }
        }]
    })
        .then(well => {
            let curves = [];
            if (well) {
                // res.send(well);
                let lasFileName = 'exports/'+well.name + '.las';                
                writeVersion(lasFileName);
                writeWellHeader(lasFileName, well.well_headers);
                writeCurve(lasFileName, well.datasets, res);
            } else {
                res.send('no well found');
            }
        })
});

function writeVersion(lasFileName) {
    fs.appendFileSync(lasFileName, '~Version\r\n');
    fs.appendFileSync(lasFileName, 'VERS .        2      : CWLS LAS Version 2.0 \r\n');
    fs.appendFileSync(lasFileName, 'WRAP .        NO     : One Line per Depth Step \r\n');
}

function writeWellHeader(lasFileName, wellHeaders) {
    fs.appendFileSync(lasFileName, '~Well\r\n');
    fs.appendFileSync(lasFileName, '#MNEM.UNIT       Data Type                    Information\r\n');
    fs.appendFileSync(lasFileName, '#---------       ---------                    -------------------------------\r\n');
    //append start depth, stop depth and step
    let strtHeader = ' STRT.M     ';
    let stopHeader = ' STOP.M     ';
    let stepHeader = ' STEP.M     ';
    for (i in wellHeaders) {
        if (wellHeaders[i].header === 'STRT') {
            strtHeader += wellHeaders[i].value;
            strtHeader = spaceAfter(36, strtHeader);
        }
        if (wellHeaders[i].header === 'STOP') {
            stopHeader += wellHeaders[i].value;
            stopHeader = spaceAfter(36, stopHeader);
        }
        if (wellHeaders[i].header === 'STEP') {
            stepHeader += wellHeaders[i].value;
            stepHeader = spaceAfter(36, stepHeader);
        }
    }
    fs.appendFileSync(lasFileName, strtHeader + ": START DEPTH\r\n");
    fs.appendFileSync(lasFileName, stopHeader + ": STOP DEPTH\r\n");
    fs.appendFileSync(lasFileName, stepHeader + ": STEP\r\n");
    //append other headers
    for (i in wellHeaders) {
        let header = " " + wellHeaders[i].header.toString() + '.';
        header = spaceAfter(12, header);
        header += wellHeaders[i].value;
        header = spaceAfter(36, header);
        if (wellHeaders[i].value && wellHeaders[i].header !== 'filename' && wellHeaders[i].header !== 'COMPANY' && wellHeaders[i].header !== 'STRT' && wellHeaders[i].header !== 'STOP' && wellHeaders[i].header !== 'STEP') {
            fs.appendFileSync(lasFileName, header + ": " + findInfo(wellHeaders[i].header.toString()) + '\r\n');
        }
    }
}

function writeCurve(lasFileName, datasets, res) {
    fs.appendFileSync(lasFileName, '~Curve\r\n');
    fs.appendFileSync(lasFileName, '#MNEM.UNIT       API Code            Curve    Description\r\n');
    fs.appendFileSync(lasFileName, '#--------        --------------      -----    -------------------\r\n');
    fs.appendFileSync(lasFileName, 'DEPTH.M  :\r\n');
    let paths = [];
    let top = [];
    let bottom = [];
    let step = [];
    let numberDatasets = datasets.length;
    let curveColumns = '~A  DEPTH   ';
    for (dataset of datasets) {
        for (curve of dataset.curves) {
            top.push(Number.parseFloat(dataset.top));
            bottom.push(Number.parseFloat(dataset.bottom));
            step.push(Number.parseFloat(dataset.step));
            curve.path = '../../../../../../' + config.dataPath + '/' + curve.path;
            paths.push(curve.path);
            fs.appendFileSync(lasFileName, curve.name + '.' + curve.unit + '  :\r\n');
            curveColumns += curve.name + '   ';
        }
    }
    fs.appendFileSync(lasFileName, '~Parameter\r\n');
    fs.appendFileSync(lasFileName, '#MNEM.UNIT       Value                        Description\r\n');
    fs.appendFileSync(lasFileName, '#---------       ---------                    -------------\r\n');
    fs.appendFileSync(lasFileName, curveColumns + '\r\n');

    //append curve  ver2

    let readStreams = [];
    for (let path of paths) {
        let stream = fs.createReadStream(path);
        stream = byline.createStream(stream);
        readStreams.push(stream);
    }
    let x = "";
    for (let i = 0; i < readStreams.length; i++) {
        readStreams[i].on('data', function (line) {
            let tokens = line.toString('utf8').split("||");
            x = tokens;
            tokens = tokens.toString().substring(tokens.toString().indexOf(" ") + 1);
            tokens = spaceBefore(18, tokens);
            if (i === 0) {
                let depth = top[i].toFixed(4).toString();
                depth = spaceBefore(15, depth);
                tokens = depth + tokens;
                top[i] += step[i];
            }

            if (i !== readStreams.length - 1) {
                fs.appendFileSync(lasFileName, tokens);
                readStreams[i].pause();
                if (readStreams[i + 1].isPaused()) {
                    readStreams[i + 1].resume();
                }
            } else {
                fs.appendFileSync(lasFileName, tokens + '\r\n');
                readStreams[i].pause();
                if (readStreams[0].isPaused()) {
                    readStreams[0].resume();
                }
            }
        })
        readStreams[i].on('end', function () {
            if (i === readStreams.length - 1) {
                res.sendFile(path.join(__dirname,'../', lasFileName));
                console.log('done');
            } else {
                console.log('end', i);
                readStreams[i+1].resume()
            }
        })
    }
}

function spaceBefore(width, string) {
    let l = string.length;
    for (let i = 0; i < width - l; i++) {
        string = " " + string;
    }
    return string;
}

function spaceAfter(width, string) {
    let l = string.length;
    for (let i = 0; i < width - l; i++) {
        string = string + " ";
    }
    return string;
}

function findInfo(unit) {
    let headers = [
        {
            unit: 'NULL',
            info: 'NULL'
        }, {
            unit: 'COMP',
            info: 'COMPANY NAME'
        }, {
            unit: 'WELL',
            info: 'WELL NAME'
        }, {
            unit: 'FLD',
            info: 'FIELD NAME'
        }, {
            unit: 'LOC',
            info: 'LOCATION'
        }, {
            unit: 'PROV',
            info: 'PROVINCE'
        }, {
            unit: 'COUN',
            info: 'COUNTRY'
        }, {
            unit: 'CTRY',
            info: 'COUNTRY'
        }, {
            unit: 'SRVC',
            info: 'SERVICE COMPANY'
        }, {
            unit: 'DATE',
            info: 'SERVICE DATE'
        }, {
            unit: 'UWI',
            info: 'UNIQUE WELL ID'
        }, {
            unit: 'LIC',
            info: 'LICENCE NUMBER'
        }, {
            unit: 'LATI',
            info: 'LATITUDE'
        }, {
            unit: 'LONG',
            info: 'LONGITUDE'
        }, {
            unit: 'GDAT',
            info: 'GEODETIC DATUM'
        }
    ]
    let info = "";
    for (header of headers) {
        if (header.unit === unit) {
            info = header.info;
        }
    }
    return info;
}

module.exports = router;