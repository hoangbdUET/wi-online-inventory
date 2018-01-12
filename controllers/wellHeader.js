'use strict'

function WellHeader(name, LASMnemnics, CSVMnemnics, ID) {
    this.name = name;
    this.LASMnemnics = LASMnemnics;
    this.CSVMnemnics = CSVMnemnics;
    this.headerID = ID;
}

module.exports = {
    TOP : new WellHeader('Top depth', 'STRT', 'Top Depth', 1),
    STOP : new WellHeader('Bottom depth', 'STOP', 'Bottom Depth', 2),
    STEP : new WellHeader('Step', 'STEP', 'Step', 3),
    NULL : new WellHeader('Null value', 'NULL', 'Null value', 4),
    WELL : new WellHeader('WELL', 'WELL', 'WellName', 5),
    UWI : new WellHeader('UWI', 'UWI', 'Unique Well Identifier', 6),
    API : new WellHeader('API', 'API', 'API', 7),
    LATI : new WellHeader('Latitude', 'LATI', 'Latitude', 8),
    LONG : new WellHeader('Longtitude', 'LONG', 'Longtitude', 9),
    EASTING : new WellHeader('Easting (X)', 'E', 'Easting (X)', 10),
    NORTHING : new WellHeader('Northing (Y)', 'N', 'Northing (y)', 11),
    KB : new WellHeader('KB elevation ', 'KB', 'KB Elevation', 12),
    GL : new WellHeader('GL elevation', 'GL', 'GL Elevation', 13),
    TD : new WellHeader('Total depth', 'TD', '', 14),
    ID : new WellHeader('Id', 'ID', 'ID', 15),
    NAME : new WellHeader('Name', 'NAME', 'Name', 16),
    COMPANY : new WellHeader('Company', 'COMP', 'Company', 17),
    OPERATOR : new WellHeader('Operator', 'OPERATOR', 'Operator', 18),
    AUTHOR : new WellHeader('Author', 'AUTHOR', 'Author', 19),
    DATE : new WellHeader('Date', 'DATE', 'Date', 20),
    LOGDATE : new WellHeader('Logging date', 'LOGDATE', 'Logging Date', 21),
    SRVC : new WellHeader('Service company', 'SRVC', 'ServiceCompany', 22),
    GDAT : new WellHeader('GeoDatum', 'GDAT', 'GeoDatum', 23),
    LIC : new WellHeader('License number', 'LIC', 'License', 24),
    CNTY : new WellHeader('County', 'CNTY', 'County', 25),
    STATE : new WellHeader('State', 'STATE', 'State', 26),
    PROV : new WellHeader('Province', 'PROV', 'Province', 27),
    CTRY : new WellHeader('Country', 'CTRY', 'Country', 28),
    LOC : new WellHeader('Location', 'LOC', 'Location', 29),
    FLD : new WellHeader('Field', 'FLD', 'Field', 30),
    PROJ : new WellHeader('Project', 'PROJ', 'Project', 31),
    CODE : new WellHeader('Code', 'CODE', 'Code', 32),
    AREA : new WellHeader('Area', 'AREA', 'Area', 33),
    TYPE : new WellHeader('Area', 'TYPE', 'Area', 34),
    STATUS : new WellHeader('Status', 'STATUS', 'Status', 35),
    GEN1 : new WellHeader('Gen 01', 'GEN1', 'Gen1', 36),
    GEN2 : new WellHeader('Gen 02', 'GEN2', 'Gen2', 37),
    GEN3 : new WellHeader('Gen 03', 'GEN3', 'Gen3', 38),
    GEN4 : new WellHeader('Gen 04', 'GEN4', 'Gen4', 39),
    GEN5 : new WellHeader('Gen 05', 'GEN5', 'Gen5', 40),
    GEN6 : new WellHeader('Gen 06', 'GEN6', 'Gen6', 41)
}