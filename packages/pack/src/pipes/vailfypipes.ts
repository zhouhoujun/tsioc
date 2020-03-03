import { IPipeTransform, Pipe } from '@tsdi/components';
import { isString } from '@tsdi/ioc';


@Pipe('path')
export class PathPipe implements IPipeTransform {
    transform(value: any, defaults: string): any {
        console.log(value, defaults);
        if (isString(value)) {
            return value;
        }
        return value ? defaults : null;
    }
}
