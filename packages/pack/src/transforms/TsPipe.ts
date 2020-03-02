import { IPipeTransform, Pipe } from '@tsdi/components';
import { ITransform } from '../ITransform';

const filter = require('gulp-filter');

const jsFilter = filter('**/*.js');
const dtsFtr = filter('**/*.d.ts');

@Pipe('tsjs')
export class TypeScriptJsPipe implements IPipeTransform  {
    transform(value: ITransform): ITransform {
        return value.pipe(jsFilter);
    }
}

@Pipe('dts')
export class TypeScriptDtsPipe implements IPipeTransform {
    transform(value: ITransform): ITransform {
        return value.pipe(dtsFtr);
    }
}
