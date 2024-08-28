// import { Injectable } from '@tsdi/ioc';

// @Injectable()
// export class DBTypeAdapter {

//     isEnum(dbtype: string) {
//         return dbtype === 'enum'
//     }

//     isBoolean(dbtype: string): boolean {
//         return boolExp.test(dbtype)
//     }

//     isBigint(dbtype: string) {
//         return dbtype === 'bigint'
//     }

//     isInt(dbtype: string) {
//         return intExp.test(dbtype)
//     }

//     isFloat(dbtype: string) {
//         return floatExp.test(dbtype)
//     }

//     isDouble(dbtype: string) {
//         return doubleExp.test(dbtype)
//     }

//     isDecimal(dbtype: string) {
//         return decExp.test(dbtype)
//     }

//     isString(dbtype: string) {
//         return strExp.test(dbtype)
//     }

//     isDate(dbtype: string) {
//         return dateExp.test(dbtype)
//     }

//     isJson(dbtype: string) {
//         return jsonExp.test(dbtype);
//     }

//     isBuffer(dbtype: string) {
//         return bufferExp.test(dbtype)
//     }
    
// }

// const intExp = /^((tiny|small|medium)?int\w*|long)$/;
// const floatExp = /^float\d*$/;
// const doubleExp = /^double(\sprecision)?$/;
// const decExp = /^(\w*decimal|dec|real|numeric|number)$/;
// const dateExp = /^((\s|\w)*time(\s|\w)*|\w*date)$/;
// const boolExp = /^(bool|boolean|bit|varbit)$/;
// const strExp = /^(uuid|string|\w*text|(\s|\w)*char(\s|\w)*)$/;
// const bufferExp = /^(\w*binary|\w*blob|\w*bytes|(\s|\w)*raw|image|\w*clob)$/;
// const row = /^(\s|\w)*raw$/;
// const blob = /^\w*blob$/;
// const clob = /^\w*clob$/;

// const jsonExp = /^(\s|\w)*json(b)?$/;