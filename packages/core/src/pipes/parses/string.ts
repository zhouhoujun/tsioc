
import { isNil } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { PipeTransform, invalidPipeArgument } from '../pipe';


/**
 * parse string.
 */
@Pipe('string')
export class StringPipe implements PipeTransform<string> {

    transform(value: any, length?: number): string {
        if (isNil(value)) throw invalidPipeArgument(this, value);

        const str = String(value);
        if (length && str.length > length) {
            throw invalidPipeArgument(this, value, 'more than max lenght:' + length)
        }
        return str
    }
}
