import { IPipeTransform, Pipe } from '@tsdi/components';


@Pipe('tsjs')
export class TypeScriptJsPipe implements IPipeTransform  {
    transform(value: any): any {
        return value.js;
    }
}

@Pipe('dts')
export class TypeScriptDtsPipe implements IPipeTransform {
    transform(value: any): any {
        return value.dts;
    }
}
