import { DefaultInvocationContext, Injector } from '@tsdi/ioc';
import { Context, Packet } from '@tsdi/common';

export class JsonContext extends DefaultInvocationContext implements Context {

    constructor(injector: Injector, public packet: Packet, public raw: Buffer, options?: any) {
        super(injector, options)
    }
}
