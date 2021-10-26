import { isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata/decor';
import { PipeTransform, invalidPipeArgumentError } from '../pipe';

@Pipe('int')
export class ParseIntPipe implements PipeTransform<number> {

    transform(value: any, ...args: any[]): number {
        let ret: number;
        if (isString(value)) {
            ret = parseInt(value, 10);
        } else if (isNumber(value)) {
            ret = parseInt(value.toString(), 10);
        } else {
            ret = NaN;
        }
        if (isNaN(ret)) {
            throw invalidPipeArgumentError(this, value);
        }
        return ret;
    }

}
