import { OnDestroy } from '@tsdi/ioc';
import { CodingsContext } from '@tsdi/common/codings';
import { AbstractTransportSession, TransportCodingsOpts } from './TransportSession';

/**
 * transprot codings context.
 */
export class TransportContext extends CodingsContext<TransportCodingsOpts> implements OnDestroy {

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

    constructor(readonly session: AbstractTransportSession) {
        super(session.options)
    }

}
