import { OnDestroy, Type } from '@tsdi/ioc';
import { CodingsContext, CodingsOption } from '@tsdi/common/codings';
import { AbstractTransportSession } from './TransportSession';

/**
 * transprot codings context.
 */
export class TransportContext extends CodingsContext<CodingsOption> implements OnDestroy {
    /**
     * channel
     */
    channel?: string;

    constructor(
        public session: AbstractTransportSession,
        options: CodingsOption,
        defaults: Map<Type | string, Type | string>
        
    ) {
        super(options, defaults)
    }

    override onDestroy(): void {
        super.onDestroy();
        this.session = null!;
    }
}

