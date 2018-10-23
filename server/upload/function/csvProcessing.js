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
            let configs = req.body;

            let selectedFields = [];
            let titleOfFields = [];
            let units = [];
            if (typeof configs['Header line Data'] == 'string') {
                selectedFields.push(configs.selectFields);
                titleOfFields.push(configs['Header line Data']);
                units.push(configs['Unit line Data']);
            } else {
                selectedFields = configs.selectFields;
                titleOfFields = configs['Header line Data'];
                units = configs['Unit line Data'];
            }

            titleOfFields.forEach((tof, id, arr) => {
                let idxOfTheSameCurve;
                let duplicateCurve;
                arr.forEach((e, idx) => {
                    if (tof == e && idx > id) {
                        idxOfTheSameCurve = idx;
                        duplicateCurve = e;
                    }
                });
                if (duplicateCurve) {
                    let newName = '';
                    let check = false;
                    let suffixId = 1;
                    do {
                        newName = `${duplicateCurve}_${suffixId}`;
                        if (
                            !arr.find(
                                (e, index) =>
                                    e == newName && index > idxOfTheSameCurve
                            )
                        )
                            check = true;
                        suffixId++;
                    } while (!check);
                    arr[idxOfTheSameCurve] = newName;
                }
            });

            console.log(selectedFields, titleOfFields, units);

            // resolve([]);

            let inputFile = req.files[0];
            let inputURL = inputFile.path;
            let curveChosen = [];
            let count = 0;
            let output = [];
            let separator;
            let INDEXSETTING = selectedFields;
            let TITLE = titleOfFields;
            var importData = {};
            if (configs.coreData) {
                importData.coreData = configs.coreData;
            }
            importData.userInfo = req.decoded;
            importData.override = !!(
                configs.override && configs.override === 'true'
            );
            importData.titleFields = titleOfFields;
            importData.units = units;
            importData.unitDepth = configs.unitReference;
            importData.well = {
                filename: inputFile.originalname,
                name: configs['Well Name'],
                dataset: configs['Dataset Name'],
                NULL: {
                    value: configs.NULL,
                    description: ''
                },
                STOP: {
                    value: null,
                    description: ''
                }
            };

            function createRegex() {
                let regex = /[ \t\,\;]/;
                if (configs.delimiter != '') {
                    separator = configs.delimiter;
                    return;
                } else {
                    if (!configs.decimal) {
                        separator = regex;
                    } else {
                        separator = new RegExp(
                            regex.source.replace('\\' + configs.decimal, '')
                        );
                    }
                }
            }

            createRegex();

            fs.createReadStream(inputURL)
                .pipe(
                    csv2({
                        separator: /,/
                    })
                )
                .pipe(
                    through2({objectMode: true}, function(
                        chunk,
                        enc,
                        callback
                    ) {
                        let data = [];
                        chunk = chunk[0].split(separator);
                        data.push(chunk[configs['Reference Column']]);
                        importData.well.STOP.value =
                            chunk[configs['Reference Column']];
                        for (let i = 0; i < INDEXSETTING.length; i++) {
                            if (
                                INDEXSETTING[i] != configs['Reference Column']
                            ) {
                                if (
                                    configs.decimal &&
                                    configs.decimal != '.' &&
                                    chunk[INDEXSETTING[i]]
                                ) {
                                    chunk[INDEXSETTING[i]] = chunk[
                                        INDEXSETTING[i]
                                    ].replace(configs.decimal, '.');
                                    chunk[configs['Reference Column']] = chunk[
                                        configs['Reference Column']
                                    ].replace(configs.decimal, '.');
                                }
                                data.push(chunk[INDEXSETTING[i]]);
                            }
                        }

                        configWellHeader(chunk, count, configs);
                        this.push(data);
                        callback();
                    })
                )
                .on('data', function(data) {
                    if (
                        count == configs['Unit line'] ||
                        count >= configs['Data first line']
                    ) {
                        let myObj = {Depth: data[0]};
                        for (let i = 1; i < data.length; i++) {
                            myObj[TITLE[i]] = data[i];
                        }
                        curveChosen.push(myObj);
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
                                headers: true
                            }
                        )
                        .on('finish', async function() {
                            let result = await CSVExtractor(
                                inputURL,
                                importData
                            );
                            console.log(
                                '===>' + JSON.stringify(result, null, 2)
                            );
                            let uploadResult = await importToDB(
                                result,
                                importData
                            );
                            output.push(uploadResult);
                            resolve(output);
                        });
                });

            // let selectedFields = [];
            // let titleOfFields = [];
            // let units = [];
            // if (typeof req.body.titleOfFields == 'string') {
            //     selectedFields.push(req.body.selectedFields);
            //     titleOfFields.push(req.body.titleOfFields);
            //     units.push(req.body.units);
            // } else {
            //     selectedFields = req.body.selectedFields;
            //     titleOfFields = req.body.titleOfFields;
            //     units = req.body.units;
            // }

            // let inputFile = req.files[0];
            // let inputURL = inputFile.path;
            // let curveChosen = [];
            // let count = 0;
            // let output = [];
            // let separator = req.body.delimiter;
            // let INDEXSETTING = selectedFields;
            // let TITLE = titleOfFields;
            // var importData = {};
            // importData.userInfo = req.decoded;
            // importData.override = !!(
            //     req.body.override && req.body.override === 'true'
            // );
            // importData.titleFields = titleOfFields;
            // importData.units = units;
            // importData.unitDepth = req.body.unitDepth;
            // importData.well = {
            //     filename: inputFile.originalname,
            //     name: req.body.wellName,
            //     dataset: req.body.datasetName,
            //     NULL: {
            //         value: req.body.defaultNULL,
            //         description: '',
            //     },
            //     STOP: {
            //         value: null,
            //         description: '',
            //     },
            // };

            // function createRegex() {
            //     let regex = /[ \t\,\;]/;
            //     if (req.body.delimiter != '') {
            //         separator = req.body.delimiter;
            //         return;
            //     } else {
            //         if (!req.body.decimalComma) {
            //             separator = regex;
            //         } else {
            //             separator = new RegExp(
            //                 regex.source.replace(
            //                     '\\' + req.body.decimalComma,
            //                     '',
            //                 ),
            //             );
            //         }
            //     }
            // }

            // createRegex();

            // fs.createReadStream(inputURL)
            //     .pipe(
            //         csv2({
            //             separator: /,/,
            //         }),
            //     )
            //     .pipe(
            //         through2({objectMode: true}, function(
            //             chunk,
            //             enc,
            //             callback,
            //         ) {
            //             let data = [];
            //             chunk = chunk[0].split(separator);
            //             importData.well.STOP.value = chunk[req.body.depthIndex];
            //             for (let i = 0; i < INDEXSETTING.length; i++) {
            //                 if (INDEXSETTING[i] != req.body.depthIndex) {
            //                     if (
            //                         req.body.decimalComma &&
            //                         req.body.decimalComma != '.' &&
            //                         chunk[INDEXSETTING[i]]
            //                     ) {
            //                         chunk[INDEXSETTING[i]] = chunk[
            //                             INDEXSETTING[i]
            //                         ].replace(req.body.decimalComma, '.');
            //                         chunk[req.body.depthIndex] = chunk[
            //                             req.body.depthIndex
            //                         ].replace(req.body.decimalComma, '.');
            //                     }
            //                     data.push(chunk[INDEXSETTING[i]]);
            //                 }
            //             }

            //             configWellHeader(chunk, count);
            //             this.push(data);
            //             callback();
            //         }),
            //     )
            //     .on('data', function(data) {
            //         if (
            //             count == req.body.unitLineIndex ||
            //             count >= req.body.dataLineIndex
            //         ) {
            //             let myObj = {};
            //             for (let i = 0; i < data.length; i++) {
            //                 myObj[TITLE[i]] = data[i];
            //             }
            //             curveChosen.push(myObj);
            //         }
            //         count++;
            //     })
            //     .on('end', function() {
            //         fs.unlinkSync(inputURL);
            //         fast_csv
            //             .writeToStream(
            //                 fs.createWriteStream(inputURL),
            //                 curveChosen,
            //                 {
            //                     headers: true,
            //                 },
            //             )
            //             .on('finish', async function() {
            //                 let result = await CSVExtractor(
            //                     inputURL,
            //                     importData,
            //                 );
            //                 console.log(
            //                     '===>' + JSON.stringify(result, null, 2),
            //                 );
            //                 let uploadResult = await importToDB(
            //                     result,
            //                     importData,
            //                 );
            //                 output.push(uploadResult);
            //                 resolve(output);
            //             });
            //     });
        } catch (err) {
            console.log('Failed: ' + err);
            reject(err);
        }

        function configWellHeader(chunk, count, configs) {
            if (count == parseInt(configs['Data first line'])) {
                importData.well.STRT = {};
                // importData.well.name = chunk[0];
                importData.well.STRT.value = chunk[configs['Reference Column']];
                importData.well.STRT.description = '';
            }
            if (count == parseInt(configs['Data first line']) + 1) {
                importData.well.STEP = {};
                if (importData.coreData) {
                    let step = 0.0;
                    importData.well.STEP.value = step.toString();
                } else {
                    importData.well.STEP.value = (
                        chunk[configs['Reference Column']] -
                        importData.well.STRT.value
                    )
                        .toFixed(4)
                        .toString();
                }
                importData.well.STEP.description = '';
            }
        }
    });
}

module.exports = {
    uploadCSVFile: uploadCSVFile
};
