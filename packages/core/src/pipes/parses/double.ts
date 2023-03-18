import { isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { invalidPipeArgument, PipeTransform } from '../pipe';


/**
 * parse double.
 */
@Pipe('double')
export class DoublePipe implements PipeTransform<number> {

    transform(value: any, precision?: number): number {
        let ret: number;
        if (isString(value)) {
            ret = parseFloat(value)
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