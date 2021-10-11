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
