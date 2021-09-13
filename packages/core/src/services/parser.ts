import { Token, Singleton, isNumber, isBoolean, isString, isDate, isNil } from '@tsdi/ioc';
import { TypeParser } from './intf';

/**
 * base type parser.
 */
@Singleton(TypeParser)
export class BaseTypeParser implements TypeParser {
    /**
     * parse param.
     *
     * @template T
     * @param {Token<T>} type
     * @param {*} paramVal
     * @returns {T}
     */
    parse<T>(type: Token<T> | Function, paramVal: any): T {
        if (isNil(paramVal)) {
            return paramVal;
        }
        let val;
        if (type === String) {
            val = isString(paramVal) ? paramVal : String(paramVal).toString();
        } else if (type === Boolean) {
            if (isBoolean(paramVal)) {
                val = paramVal
            } else if (isString(paramVal)) {
                switch (paramVal.toLowerCase()) {
                    case 'true':
                        val = true;
                        break;
                    case 'false':
                        val = false;
                        break;
                    default:
                        val = Boolean(paramVal);
                        break;
                }
            } else {
                val = Boolean(paramVal);
            }
        } else if (type === Number) {
            val = isNumber(paramVal) ? paramVal : Number(paramVal);
        } else if (type === Date) {
            val = isDate(paramVal) ? paramVal : new Date(paramVal);
        } else {
            val = paramVal;
        }
        return val;
    }
}

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
