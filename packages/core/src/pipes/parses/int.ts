import { isBigInt, isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { PipeTransform, invalidPipeArgument } from '../pipe';

/**
 * parse int.
 */
@Pipe('int')
export class IntPipe implements PipeTransform<number> {

    transform(value: any, radix = 10): number {
        let ret: number;
        if (isString(value)) {
            ret = parseInt(value, radix)
        } else if (isNumber(value)) {
            ret = parseInt(value.toString(), radix)
        } else {
            ret = NaN
        }
        if (isNaN(ret)) {
            throw invalidPipeArgument(this, value)
        }
        return ret
    }

}


/**
 * parse int.
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
