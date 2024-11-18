import { OnDestroy, Type } from '@tsdi/ioc';
import { CodingsAapter, CodingsContext, CodingsOptions } from '@tsdi/common/codings';
import { Transport } from './Transport';

/**
 * transprot codings context.
 */
export class TransportContext extends CodingsContext<CodingsOptions> implements OnDestroy {
    /**
     * channel
     */
    channel?: string;

    constructor(
        public transport: Transport,
        options: CodingsOptions,
        adapter?: CodingsAapter | null
    ) {
        super(options, adapter)
    }

    override onDestroy(): void {
        super.onDestroy();
        this.transport = null!;
    }
}

