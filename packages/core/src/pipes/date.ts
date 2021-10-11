import { isDate, isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../metadata/decor';
import { invalidPipeArgumentError } from './err';
import { PipeTransform } from './pipe';

export function formatDate(date: Date, fmt: string = 'yyyy-MM-dd') {
    var o = {
        "M+": date.getMonth() + 1, //月份
        "d+": date.getDate(), //日
        "h+": date.getHours(), //小时
        "m+": date.getMinutes(), //分
        "s+": date.getSeconds(), //秒
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度
        "S": date.getMilliseconds() //毫秒
    } as any;
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}



/**
 * date format pipe.
 */
 @Pipe('date-format')
 export class DateFormatPipe implements PipeTransform<string> {

     transform(value: any, ...args: any[]): string {
        let date:Date|null = null;
        if(isString(value)|| isNumber(value)){
            date = new Date(value);
        } else if(isDate(value)){
            date = value;
        }

        if(isDate(value)){
            return formatDate(date as Date, args.length? args[0] : 'yyyy-MM-dd')
        } else {
            
            throw invalidPipeArgumentError(this, value);
        }
     }
     
 }