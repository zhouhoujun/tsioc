import { isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { PipeTransform, invalidPipeArgument } from '../pipe';

/**
 * parse long.
 */
@Pipe('long')
export class LongPipe implements PipeTransform<number | bigint> {

    transform(value: any, radix = 10): number | bigint {
        let ret: number | bigint;
        if (isString(value)) {
            if(Number.isSafeInteger(value)){
                ret = parseInt(value, radix)                
            } else {
                ret = BigInt(value)
            }
        } else if (isNumber(value)) {
            ret = parseInt(value.toString(), radix)
        } else {
            ret = NaN
        }
        if (isNaN(ret as number)) {
            throw invalidPipeArgument(this, value)
        }
        return ret
    }

}

