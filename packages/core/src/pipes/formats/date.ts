import { isDate, isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { PipeTransform, invalidPipeArgument } from './../pipe';

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
export function formatDate(date: Date, fmt = 'yyyy-MM-dd') {
    const o = {
        "M+": date.getMonth() + 1, //月份
        "d+": date.getDate(), //日
        "h+": date.getHours(), //小时
        "m+": date.getMinutes(), //分
        "s+": date.getSeconds(), //秒
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度
        'w+': getWeek(date), //周
        "S": date.getMilliseconds(), //毫秒
    } as any;
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substring(4 - RegExp.$1.length));
    for (const k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substring(("" + o[k]).length)));
    return fmt
}

function getWeek(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);  // 获取当年的第一天
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;  // 计算已经过去的天数
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);  // 计算当前日期是第几周
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
@Pipe('date-format')
export class DateFormatPipe implements PipeTransform<string> {

    transform(value: any, ...args: any[]): string {
        let date: Date | null = null;
        if (isString(value) || isNumber(value)) {
            date = new Date(value)
        } else if (isDate(value)) {
            date = value
        }

        if (isDate(value)) {
            return formatDate(date as Date, args.length ? args[0] : 'yyyy-MM-dd')
        } else {
            throw invalidPipeArgument(this, value)
        }
    }
}
