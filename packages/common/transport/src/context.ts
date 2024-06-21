import { OnDestroy, Type } from '@tsdi/ioc';
import { CodingsContext, CodingsOptions } from '@tsdi/common/codings';
import { AbstractTransportSession } from './TransportSession';

/**
 * transprot codings context.
 */
export class TransportContext extends CodingsContext<CodingsOptions> implements OnDestroy {
    /**
     * channel
     */
    channel?: string;

    constructor(
        public session: AbstractTransportSession,
        options: CodingsOptions,
        defaults: Map<Type | string, Type | string>
        
    ) {
        super(options, defaults)
    }

    override onDestroy(): void {
        super.onDestroy();
        this.session = null!;
    }
}

