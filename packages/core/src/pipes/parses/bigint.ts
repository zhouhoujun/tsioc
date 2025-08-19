import { isBigInt, isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { PipeTransform, invalidPipeArgument } from '../pipe';

/**
 * parse bigint.
 */
@Pipe('bigint')
export class BigintPipe implements PipeTransform<bigint> {

    transform(value: any): bigint {
        let ret: bigint;
        if (isString(value)) {
            ret = BigInt(value)
        } else if (isNumber(value)) {
            ret = BigInt(value)
        } else if (isBigInt(value)) {
            ret = value
        } else {
            throw invalidPipeArgument(this, value)
        }
        return ret
    }

}
