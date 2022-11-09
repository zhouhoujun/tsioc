import { isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { PipeTransform, invalidPipeArgument } from '../pipe';

/**
 * parse number.
 */
@Pipe('number')
export class ParseNumberPipe implements PipeTransform<number> {

    transform(value: any, ...args: any[]): number {
        let ret: number;
        if (isString(value)) {
            try {
                ret = Number(value)
            } catch {
                throw invalidPipeArgument(this, value)
            }
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