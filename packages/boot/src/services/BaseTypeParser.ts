import { IBaseTypeParser, BaseTypeParserToken } from './IBaseTypeParser';
import { Token, Singleton, isNumber, isBoolean, isString, isDate, isNullOrUndefined } from '@tsdi/ioc';

@Singleton(BaseTypeParserToken)
export class BaseTypeParser implements IBaseTypeParser {

    /**
     * parse param.
     *
     * @template T
     * @param {Token<T>} type
     * @param {*} paramVal
     * @returns {T}
     * @memberof BaseTypeParser
     */
    parse<T>(type: Token<T>, paramVal: any): T {
        if (isNullOrUndefined(paramVal)) {
            return paramVal;
        }
        let val;
        if (type === String) {
            val = isString(paramVal) ? paramVal : String(paramVal);
        } else if (type === Boolean) {
            val = isBoolean(paramVal) ? paramVal : new Boolean(paramVal);
        } else if (type === Number) {
            val = isNumber(paramVal) ? paramVal : parseFloat(paramVal);
        } else if (type === Date) {
            val = isDate(paramVal) ? paramVal : new Date(paramVal);
        } else {
            val = paramVal;
        }
        return val;
    }
}
