import { OnDestroy, Token } from '@tsdi/ioc';
import { Context, ContextToken } from '@tsdi/core';
import { Transport } from './Transport';


/**
 * transprot context.
 */
export class TransportContext extends Context implements OnDestroy {

    public incoming: any;
    constructor(
        readonly transport: Transport,
        entries?: readonly (readonly [Token, any])[] | null
    ) {
        super(entries)
    }


    static create(transport: Transport, entries?: readonly (readonly [Token, any])[] | null) {
        return new TransportContext(transport, entries);
    }
}

export const TEXT_DECODER = new ContextToken(()=> new TextDecoder());
