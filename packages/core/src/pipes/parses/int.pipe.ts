import { isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata/decor';
import { PipeTransform, invalidPipeArgumentError } from '../pipe';

/**
 * parse int.
 */
@Pipe('int')
export class ParseIntPipe implements PipeTransform<number> {

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
            throw invalidPipeArgumentError(this, value)
        }
        return ret
    }

}
