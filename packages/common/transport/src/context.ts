import { OnDestroy } from '@tsdi/ioc';
import { CodingsContext } from '@tsdi/common/codings';
import { AbstractTransportSession, TransportOpts } from './TransportSession';

/**
 * transprot codings context.
 */
export class TransportContext extends CodingsContext<TransportOpts> implements OnDestroy {
    /**
     * channel
     */
    channel?: string;

    constructor(readonly session: AbstractTransportSession) {
        super(session.options)
    }

}
