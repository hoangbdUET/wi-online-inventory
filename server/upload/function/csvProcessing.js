const fs = require('fs');
const fast_csv = require('fast-csv');
const csv2 = require('csv2');
const through2 = require('through2');
const CSVExtractor = require('wi-import').extractFromCSV;
const importToDB = require('./importToDB');
const readline = require('line-by-line');

function uploadCSVFile(req) {
    return new Promise(function(resolve, reject) {
        try {
            // console.log(req.body);
            let inputFile = req.files[0];
            let inputURL = inputFile.path;
            let curveChosen = [];
            let count = 0;
            let output = [];

            let CHECKHEADERLINE = req.body.checkHeaderLine;
            let INDEXSETTING = req.body.selectedFields;
            let TITLE = req.body.titleOfFields;
            let delimiter =
                req.body.delimiter != '' ? req.body.delimiter : /\s|\t/g;
            var importData = {};
            importData.userInfo = req.decoded;
            importData.override = !!(
                req.body.override && req.body.override === 'true'
            );
            importData.titleFields = req.body.titleOfFields;
            importData.units = req.body.units;
            importData.well = {
                filename: inputFile.originalname,
                name: req.body.wellName,
                dataset: req.body.datasetName,
                NULL: {
                    value: req.body.defaultNULL,
                    description: '',
                },
                STOP: {
                    value: null,
                    description: '',
                },
            };

            if (!req.body.depthIndex) {
                reject('No depth column');
            }

            fs.createReadStream(inputURL)
                .pipe(
                    csv2({
                        separator: req.body.separator,
                    }),
                )
                .pipe(
                    through2({objectMode: true}, function(
                        chunk,
                        enc,
                        callback,
                    ) {
                        let data = [];
                        configWellHeader(chunk, count);
                        importData.well.STOP.value = chunk[req.body.depthIndex];
                        for (let i = 0; i < INDEXSETTING.length; i++) {
                            if (INDEXSETTING[i] != req.body.depthIndex) {
                                data.push(chunk[INDEXSETTING[i]]);
                            }
                        }
                        this.push(data);
                        callback();
                    }),
                )
                .on('data', function(data) {
                    if (count >= req.body.headerLineIndex) {
                        if (CHECKHEADERLINE == 'false') {
                            let myObj = {};
                            for (let i = 0; i < data.length; i++) {
                                myObj[TITLE[i]] = data[i];
                            }
                            curveChosen.push(myObj);
                        } else {
                            CHECKHEADERLINE = 'false';
                        }
                    }
                    count++;
                })
                .on('end', function() {
                    fs.unlinkSync(inputURL);
                    fast_csv
                        .writeToStream(
                            fs.createWriteStream(inputURL),
                            curveChosen,
                            {
                                headers: true,
                            },
                        )
                        .on('finish', async function() {
                            let result = await CSVExtractor(
                                inputURL,
                                importData,
                            );
                            let uploadResult = await importToDB(
                                result,
                                importData,
                            );
                            output.push(uploadResult);
                            resolve(output);
                        });
                });
        } catch (err) {
            console.log('Failed: ' + err);
            reject(err);
        }

        function configWellHeader(chunk, count) {
            if (count == parseInt(req.body.headerLineIndex) + 2) {
                importData.well.STRT = {};
                // importData.well.name = chunk[0];
                importData.well.STRT.value = chunk[req.body.depthIndex];
                importData.well.STRT.description = '';
            }
            if (count == parseInt(req.body.headerLineIndex) + 3) {
                importData.well.STEP = {};
                importData.well.STEP.value = (
                    chunk[req.body.depthIndex] - importData.well.STRT.value
                )
                    .toFixed(4)
                    .toString();
                importData.well.STEP.description = '';
            }
        }
    });
}

module.exports = {
    uploadCSVFile: uploadCSVFile,
};
