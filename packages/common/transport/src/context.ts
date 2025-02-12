import { OnDestroy, Token } from '@tsdi/ioc';
import { Context, ContextToken } from '@tsdi/core';
import { Transport } from './Transport';


/**
 * transprot context.
 */
export class TransportContext extends Context implements OnDestroy {

    constructor(
        readonly transport: Transport,
        // readonly origin: any,
        entries?: readonly (readonly [Token, any])[] | null
    ) {
        super(entries)
    }

    // first() {
    //     return this.origin
    // }

    static create(transport: Transport, entries?: readonly (readonly [Token, any])[] | null) {
        return new TransportContext(transport, entries);
    }
}

export const TEXT_DECODER = new ContextToken(()=> new TextDecoder());
