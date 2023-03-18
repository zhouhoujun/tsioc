import { Pipe } from '../../metadata';
import { PipeTransform, invalidPipeArgument } from '../pipe';


/**
 * parse boolean.
 */
@Pipe('boolean')
export class BoolPipe implements PipeTransform<boolean> {

    transform(value: any, ...args: any[]): boolean {
        if (value === true || value === 'true') {
            return true
        }
        if (value === false || value === 'false') {
            return false
        }
        throw invalidPipeArgument(this, value)
    }
}
