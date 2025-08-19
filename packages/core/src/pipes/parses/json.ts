import { isNil, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { PipeTransform, invalidPipeArgument } from '../pipe';

/**
 * parse json.
 */
@Pipe('json')
export class JsonPipe implements PipeTransform<object> {
    /**
     * @param value A value of any type to convert into a JSON-format string.
     */
    transform(value: any, length?: number): object {
        if (isNil(value)) throw invalidPipeArgument(this, value);
        if (isString(value)) {
            if (length && value.length > length) {
                throw invalidPipeArgument(this, value, 'more than max lenght:' + length)
            }
            try {
                return JSON.parse(value)
            } catch (err) {
                throw invalidPipeArgument(this, value, (err as Error).toString())
            }
        }
        return value
    }

}

