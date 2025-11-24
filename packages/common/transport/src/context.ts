import { ContextToken, OnDestroy, Token } from '@tsdi/ioc';
import { RunableContext } from '@tsdi/core';
import { Transport } from './Transport';


/**
 * transprot context.
 */
export class TransportContext extends RunableContext implements OnDestroy {

    public incoming: any;
    constructor(
        readonly transport: Transport,
        entries?: readonly [Token, any][]
    ) {
        super(transport.injector, entries)
    }


    static create(transport: Transport, entries?: readonly [Token, any][]) {
        return new TransportContext(transport, entries);
    }
}

export const TEXT_DECODER = new ContextToken(()=> new TextDecoder());
