import { isString, isArray } from '@tsdi/ioc';
import { Pipe } from '../metadata/decor';
import { invalidPipeArgumentError } from './err';
import { PipeTransform } from './pipe';


/**
 * slice pipe, for string or array.
 */
@Pipe('slice')
export class SlicePipe implements PipeTransform {
    transform(value: any, start: number, end?: number): any {
        if (value == null) return value;

        if (!this.supports(value)) {
            throw invalidPipeArgumentError(this, value);
        }

        return (value as string).slice(start, end);
    }

    private supports(obj: any): boolean {
        return isString(obj) || isArray(obj);
    }
}
