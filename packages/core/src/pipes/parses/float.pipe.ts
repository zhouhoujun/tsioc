import { isNumber, isString } from '@tsdi/ioc';
import { invalidPipeArgument } from '@tsdi/core';
import { Pipe } from '../../metadata';
import { PipeTransform } from '../pipe';

/**
 * parse float.
 */
@Pipe('float')
export class ParseFloatPipe implements PipeTransform<number> {

    transform(value: any, precision?: number): number {
        let ret: number;
        if (isString(value)) {
            ret = parseFloat(value);
        } else if (isNumber(value)) {
            ret = value
        } else {
            ret = NaN
        }
        if (isNaN(ret)) {
            throw invalidPipeArgument(this, value)
        }
        return ret
    }
}
