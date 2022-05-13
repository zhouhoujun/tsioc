import { isNumber, isString } from '@tsdi/ioc';
import { invalidPipeArgumentError } from '@tsdi/core';
import { Pipe } from '../../metadata/decor';
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
            throw invalidPipeArgumentError(this, value)
        }
        return ret
    }
}
