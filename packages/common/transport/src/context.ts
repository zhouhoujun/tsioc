import { OnDestroy, Token } from '@tsdi/ioc';
import { Context } from '@tsdi/core';
import { Transport } from './Transport';

/**
 * transprot context.
 */
export class TransportContext extends Context implements OnDestroy {

    constructor(
        readonly transport: Transport,
        readonly origin: any,
        entries?: readonly (readonly [Token, any])[] | null
    ) {
        super()
    }

    first() {
        return this.origin
    }

    static create(transport: Transport, origin: any, entries?: readonly (readonly [Token, any])[] | null) {
        return new TransportContext(transport, origin, entries);
    }
}

