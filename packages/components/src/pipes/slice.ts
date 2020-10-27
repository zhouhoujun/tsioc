import { isString, isArray } from '@tsdi/ioc';
import { Pipe } from '../decorators';
import { invalidPipeArgumentError } from './err';
import { PipeTransform } from './pipe';



@Pipe('slice')
export class SlicePipe implements PipeTransform {
    transform(value: any, start: number, end?: number): any {
        if (value == null) return value;

        if (!this.supports(value)) {
            throw invalidPipeArgumentError(this, value);
        }

        return value.slice(start, end);
    }

    private supports(obj: any): boolean {
        return isString(obj) || isArray(obj);
    }
}
