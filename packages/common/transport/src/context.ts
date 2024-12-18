import { OnDestroy } from '@tsdi/ioc';
import { Context } from '@tsdi/core';
import { Transport } from './Transport';

/**
 * transprot context.
 */
export class TransportContext extends Context implements OnDestroy {

    constructor(
        readonly transport: Transport,
        init?: any,
    ) {
        super(init)
    }
}

