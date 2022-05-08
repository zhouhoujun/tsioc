import { Middleware, TransportContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';


@Injectable()
export class CsrfMiddleware implements Middleware {

    constructor(){
        
    }

    invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
