
import { isDefined } from '@tsdi/ioc';
import { Pipe } from '../../metadata/decor';
import { PipeTransform, invalidPipeArgumentError } from '../pipe';



@Pipe('string')
export class ParseStringPipe implements PipeTransform<string> {

    transform(value: any, ...args: any[]): string {
        if (isDefined(value)) {
            return String(value);
        }
        throw invalidPipeArgumentError(this, value);
    }
}
