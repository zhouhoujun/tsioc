"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateFormatPipe = void 0;
exports.formatDate = formatDate;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("./../pipe");
/**
 * format date.
 * @param date
 * @param fmt
 *
 *
 * * datetime: `yyyy-MM-dd hh:mm:ss`
 * * weeks: `yyyy-Ww`
 * * date: `yyyy-MM-dd`
 * * time: `hh:mm:ss`
 *
 * ```
 * y: 年
 * M: 月份
 * d: 日
 * h: 小时
 * m: 分
 * q: 季度
 * w: 周
 * s: 秒
 * S: 毫秒
 * ```
 * @returns
 */
function formatDate(date, fmt = 'yyyy-MM-dd') {
    const o = {
        "M+": date.getMonth() + 1, //月份
        "d+": date.getDate(), //日
        "h+": date.getHours(), //小时
        "m+": date.getMinutes(), //分
        "s+": date.getSeconds(), //秒
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度
        'w+': getWeek(date), //周
        "S": date.getMilliseconds(), //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substring(4 - RegExp.$1.length));
    for (const k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substring(("" + o[k]).length)));
    return fmt;
}
function getWeek(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1); // 获取当年的第一天
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000; // 计算已经过去的天数
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7); // 计算当前日期是第几周
}
/**
 * date format pipe.
 *
 * * datetime: `yyyy-MM-dd hh:mm:ss`
 * * weeks: `yyyy-Ww`
 * * date: `yyyy-MM-dd`
 * * time: `hh:mm:ss`
 *
 * ```
 * y: 年
 * M: 月份
 * d: 日
 * h: 小时
 * m: 分
 * q: 季度
 * w: 周
 * s: 秒
 * S: 毫秒
 * ```
 */
let DateFormatPipe = class DateFormatPipe {
    transform(value, ...args) {
        if (!value)
            return '';
        let date = null;
        if ((0, ioc_1.isString)(value) || (0, ioc_1.isNumber)(value)) {
            date = new Date(value);
        }
        else if ((0, ioc_1.isDate)(value)) {
            date = value;
        }
        if (date) {
            return formatDate(date, args.length ? args[0] : 'yyyy-MM-dd');
        }
        else {
            throw (0, pipe_1.invalidPipeArgument)(this, value);
            // return '';
        }
    }
};
exports.DateFormatPipe = DateFormatPipe;
exports.DateFormatPipe = DateFormatPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('date-format')
], DateFormatPipe);
//# sourceMappingURL=date.js.map