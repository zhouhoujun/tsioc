import { DataType } from '@tsdi/ioc';
import { Pipe } from '../../metadata/decor';
import { invalidPipeArgumentError } from '../err';
import { PipeTransform } from '../pipe';



@Pipe('parse-boolean', DataType.Boolean)
export class ParseBoolPipe implements PipeTransform<boolean> {

    transform(value: any, ...args: any[]): boolean {
        if (value === true || value === 'true') {
            return true;
        }
        if (value === false || value === 'false') {
            return false;
        }
        try {
            return Boolean(value);
        } catch (err) {
            throw invalidPipeArgumentError(this, value);
        }
    }

}