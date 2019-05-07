const fs = require('fs');
const fast_csv = require('fast-csv');
const CSVExtractor = require('wi-import').extractFromCSV;
const importToDB = require('./importToDB');
const readline = require('line-by-line');

function uploadCSVFile(req) {
    return new Promise(function (resolve, reject) {
        try {
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
                            !arr.find((e, index) => e == newName && index > idxOfTheSameCurve)
                        )
                            check = true;
                        suffixId++;
                    } while (!check);
                    arr[idxOfTheSameCurve] = newName;
                }
            });

            let inputFile = req.files[0];
            let inputURL = inputFile.path;
            let count = 0;
            let output = [];
            let separator;
            let INDEXSETTING = selectedFields;
            let TITLE = titleOfFields;
            let curveChosen = [['Depth', ...TITLE]];
            var importData = {};
            if (configs.coreData) {
                importData.coreData = configs.coreData;
            }
            importData.userInfo = req.decoded;
            importData.override = !!(configs.override && configs.override === 'true');
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

			if (configs['Unit line'] < 0) {
				let arrLine = [''];
				for (let i = 0; i < TITLE.length; i++) {
					arrLine.push('');
				}
				curveChosen.push(arrLine);
			}

            let rl = new readline(inputURL);
            rl.on('line', function (line) {
                if (line) {
                    let data = [];
                    chunk = customSplit(line, separator);
                    data.push(chunk[configs['Reference Column']]);
                    // importData.well.STOP.value = chunk[configs['Reference Column']];
                    for (let i = 0; i < INDEXSETTING.length; i++) {
                        if (INDEXSETTING[i] != configs['Reference Column']) {
                            if (
                                configs.decimal &&
                                configs.decimal != '.' &&
                                chunk[INDEXSETTING[i]]
                            ) {
                                chunk[INDEXSETTING[i]] = chunk[INDEXSETTING[i]].replace(
                                    configs.decimal,
                                    '.'
                                );
                                chunk[configs['Reference Column']] = chunk[
                                    configs['Reference Column']
                                ].replace(configs.decimal, '.');
                            }
                            data.push(chunk[INDEXSETTING[i]]);
                        }
                    }

                    configWellHeader(chunk, count, configs);

                    if (
                        count == configs['Unit line'] ||
                        count >= configs['Data first line']
                    ) {
						let arrLine = [data[0]];
                        for (let i = 0; i < TITLE.length; i++) {
							let cell = data[i + 1];
                            if (cell && cell.includes('"')) cell = cell.slice(1, cell.length - 1);
							if (parseFloat(cell) === parseFloat(configs.NULL)) {
								arrLine.push("");
							} else arrLine.push(data[i+1]);
                        }
                        // if (count < 10)	console.log(myObj);
						if (count == configs['Unit line'] || data[0] != '') {
							importData.well.STOP.value = data[0];
							curveChosen.push(arrLine);
						}                    
					}
                    count++;
                }
            });

            rl.on('end', function () {
                fs.unlinkSync(inputURL);
                fast_csv
                    .writeToStream(fs.createWriteStream(inputURL), curveChosen, {
                        headers: true
                    })
                    .on('finish', async function () {
                        // resolve([]);
						// console.log(importData);
                        let result = await CSVExtractor(inputURL, importData);
                        let uploadResult = await importToDB(result, importData);
                        output.push(uploadResult);
                        resolve(output);
                    });
            });
        } catch (err) {
            console.log('Failed: ' + err);
            reject(err);
        }

        function customSplit(str, delimiter) {
            let words;
            if (str.includes('"')) {
                str = str.replace(/"[^"]+"/g, function (match) {
                    let tmp = match.replace(/"/g, '');
                    return '"' + Buffer.from(tmp).toString('base64') + '"';
                });
                words = str.split(delimiter);
                words = words.map(function (word) {
                    if (word.includes('"')) {
                        return (
                            '"' +
                            Buffer.from(word.replace(/"/g, ''), 'base64').toString() +
                            '"'
                        );
                    } else return word;
                });
            } else {
                words = str.split(delimiter);
            }
            return words;
        }

        function configWellHeader(chunk, count, configs) {
            if (count == parseInt(configs['Data first line'])) {
                let startDepth = chunk[configs['Reference Column']];
                if (startDepth != '') {
                    importData.well.STRT = {};
                    importData.well.STRT.value = startDepth;
                    importData.well.STRT.description = '';
                } else configs['Data first line']++;
            }
            if (count == parseInt(configs['Data first line']) + 1) {
                importData.well.STEP = {};
                if (importData.coreData) {
                    let step = 0.0;
                    importData.well.STEP.value = step.toString();
                } else {
                    importData.well.STEP.value = (
                        chunk[configs['Reference Column']] - importData.well.STRT.value
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
