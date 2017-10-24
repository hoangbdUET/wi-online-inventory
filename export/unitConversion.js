
'use strict'

//from_to = to/from

const M_DM = 0.1;
const M_CM = 0.01;
const M_MM = 0.001;
const M_KM = 1000;
const M_IN = 0.0254;
const M_FT = 0.3048;

function convert(value, from, to) {
    if(from == 'M') {
        return value / eval(from + '_' + to);
    }
    else if(to == 'M') {
        return value * eval(to + '_' + from);
    }
    else {
        return value * eval('M_' + from) / eval('M_' + to);
    }
}

module.exports = {
    convert : convert
}