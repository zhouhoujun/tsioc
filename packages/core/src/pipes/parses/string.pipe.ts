
import { isNil } from '@tsdi/ioc';
import { Pipe } from '../../metadata/decor';
import { PipeTransform, invalidPipeArgumentError } from '../pipe';


/**
 * parse string.
 */
@Pipe('string')
export class ParseStringPipe implements PipeTransform<string> {

    transform(value: any, length?: number): string {
        if (isNil(value)) throw invalidPipeArgumentError(this, value);

        const str = String(value);
        if (length && str.length > length) {
            throw invalidPipeArgumentError(this, value, 'more than max lenght:' + length)
        }
        return str
    }
}
