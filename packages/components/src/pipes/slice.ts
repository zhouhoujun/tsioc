import { lang } from '@tsdi/ioc';
import { Pipe } from '../decorators/Pipe';
import { IPipeTransform } from '../bindings/IPipeTransform';



@Pipe('slice')
export class SlicePipe implements IPipeTransform {
    transform(value: any, start: number, end?: number): any {
        if (value == null) return value;

        if (!this.supports(value)) {
            throw Error(`InvalidPipeArgument: '${value}' for pipe '${lang.getClassName(this)}'`)
        }

        return value.slice(start, end);
    }

    private supports(obj: any): boolean {
        return typeof obj === 'string' || Array.isArray(obj);
    }
}
