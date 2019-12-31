import { NodeActivityContext } from '../core';
import { IPipeTransform, Pipe } from '@tsdi/components';


@Pipe('tsjs')
export class TypeScriptJsPipe implements IPipeTransform  {
    async transform(value: any): Promise<any> {
        return value.js;
    }
    async refresh(ctx: NodeActivityContext, value: any): Promise<void> {
        ctx.result.js = value;
    }
}

@Pipe('dts')
export class TypeScriptDtsPipe implements IPipeTransform {
    async transform(value: any): Promise<any> {
        return value.dts;
    }
}
