import { Pipe } from '../../metadata/decor';
import { PipeTransform, invalidPipeArgumentError } from '../pipe';



@Pipe('boolean')
export class ParseBoolPipe implements PipeTransform<boolean> {

    transform(value: any, ...args: any[]): boolean {
        if (value === true || value === 'true') {
            return true;
        }
        if (value === false || value === 'false') {
            return false;
        }
        throw invalidPipeArgumentError(this, value);
    }
}
