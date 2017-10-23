'use strict'

const lineReader = require('line-by-line');
const unitConversion = require('./unitConversion');
const fs = require('fs');


function writeToCurveFile(buffer, curveFileName, index, value, defaultNull) {
    buffer.count += 1;
    if (value == defaultNull) {
        buffer.data += index + " null" + "\n";
    }
    else {
        buffer.data += index + " " + value + "\n";
    }
    if (buffer.count >= 1000 || buffer.end == true) {
        fs.appendFileSync(curveFileName, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}

module.exports = function (curve, unit, callback) {
    if (!unit || unit == curve.unit){
        callback(null, curve);
    } else {
        let filePath = curve.path.substring(0, curve.path.lastIndexOf('/') + 1) + unit + '_' + curve.name + '.txt';
        if (fs.existsSync(filePath)) {
            curve.path = filePath;
            callback(null, curve);
        } else {
            let lr = new lineReader(curve.path);
            let buffer = new Object();
            buffer.count = 0;
            buffer.data = '';
            buffer.end = false;
            let index = 0;

            lr.on('error', function (err) {
                console.log('loi roi: ' + err);
                // 'err' contains error object
            });

            lr.on('line', function (line) {
                let value = parseFloat(line.trim().split(' ')[1]);
                writeToCurveFile(buffer, filePath, index, unitConversion.convert(value, curve.unit, unit), 'NULL');
                index++;
            });

            lr.on('end', function () {
                fs.appendFileSync(filePath, buffer.data);
                curve.path = filePath;
                callback(null, curve);
            });
        }
    }
}
