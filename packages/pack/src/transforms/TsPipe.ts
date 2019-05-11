import { ValuePipe } from '@tsdi/activities';
import { NodeActivityContext } from '../core';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class TypeScriptJsPipe extends ValuePipe {

    async transform(value: any): Promise<any> {
        return value.js;
    }

    async refresh?(ctx: NodeActivityContext, value: any): Promise<void> {
        ctx.result.js = value;
    }
}

@Injectable()
export class TypeScriptTdsPipe extends ValuePipe {

    async transform(value: any): Promise<any> {
        return value.tds;
    }

    async refresh?(ctx: NodeActivityContext, value: any): Promise<void> {
        ctx.result.tds = value;
    }
}
