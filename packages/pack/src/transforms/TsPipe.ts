import { IPipeTransform, Pipe } from '@tsdi/components';


@Pipe('tsjs')
export class TypeScriptJsPipe implements IPipeTransform  {
    async transform(value: any): Promise<any> {
        return value.js;
    }
}

@Pipe('dts')
export class TypeScriptDtsPipe implements IPipeTransform {
    async transform(value: any): Promise<any> {
        return value.dts;
    }
}
