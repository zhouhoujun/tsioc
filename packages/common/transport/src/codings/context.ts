import { OnDestroy } from '@tsdi/ioc';
import { InvocationArgs } from '@tsdi/core';
import { AbstractTransportSession } from '../TransportSession';
import { CodingsOpts } from './options';

/**
 * transprot codings context.
 */
export class CodingsContext extends InvocationArgs implements OnDestroy {

    readonly options: CodingsOpts;
    readonly session?: AbstractTransportSession;

    /**
     * incoming origin message
     */
    incoming?: any;
    /**
     * outgoing origin message
     */
    outgoing?: any;
    /**
     * channel
     */
    channel?: string;

    private _complete = false;
    get complete(): boolean {
        return this._complete;
    }

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

    protected override onNext(data: any): void {
        if (this.options.comolete) {
            this._complete = this.options.comolete(data)
        }
        super.onNext(data);
    }


}
