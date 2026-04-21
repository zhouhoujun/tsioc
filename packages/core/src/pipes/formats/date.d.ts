import { PipeTransform } from './../pipe';
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
export declare function formatDate(date: Date, fmt?: string): string;
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
export declare class DateFormatPipe implements PipeTransform<string> {
    transform(value: any, ...args: any[]): string;
}
