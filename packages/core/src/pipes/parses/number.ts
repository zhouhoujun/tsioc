import { isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata/decor';
import { invalidPipeArgumentError } from '../err';
import { PipeTransform } from '../pipe';

@Pipe('number')
export class ParseIntPipe implements PipeTransform<number> {

    transform(value: any, ...args: any[]): number {
        let ret: number;
        if (isString(value)) {
            try {
                ret = Number(value);
            } catch {
                throw invalidPipeArgumentError(this, value);
            }
        } else if (isNumber(value)) {
            ret = value;
        } else {
            ret = NaN;
        }
        if (isNaN(ret)) {
            throw invalidPipeArgumentError(this, value);
        }
        return ret;
    }

}