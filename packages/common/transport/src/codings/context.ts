import { OnDestroy } from '@tsdi/ioc';
import { InvocationArgs } from '@tsdi/core';
import { AbstractTransportSession } from '../TransportSession';
import { CodingsOpts } from './options';


export class CodingsContext extends InvocationArgs implements OnDestroy {

    readonly options: CodingsOpts;
    readonly session?: AbstractTransportSession;

    channel?: string;

    constructor(options: CodingsOpts);
    constructor(session: AbstractTransportSession);
    constructor(args: CodingsOpts | AbstractTransportSession) {
        super()
        if (args instanceof AbstractTransportSession) {
            this.session = args;
            this.options = this.session.options;
        } else {
            this.options = args;
        }
    }


}
