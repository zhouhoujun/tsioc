import { Injector, OnDestroy, Type } from '@tsdi/ioc';
import { CodingsContext } from '@tsdi/common/codings';
import { AbstractTransportSession, TransportOpts } from './TransportSession';
import { StreamAdapter } from './StreamAdapter';
import { StatusAdapter } from './StatusAdapter';
import { MessageFactory } from '@tsdi/common';
import { IncomingFactory } from './Incoming';

/**
 * transprot codings context.
 */
export class TransportContext extends CodingsContext<TransportOpts> implements OnDestroy {
    /**
     * channel
     */
    channel?: string;

    constructor(
        public injector: Injector,
        public streamAdapter: StreamAdapter,
        public statusAdapter: StatusAdapter | null,
        public messageFactory: MessageFactory,
        public incomingFactory: IncomingFactory,
        options: TransportOpts,
        defaults: Map<Type | string, Type | string>
        
    ) {
        super(options, defaults)
    }

    override onDestroy(): void {
        super.onDestroy();
        this.injector = null!;
        this.streamAdapter = null!;
        this.statusAdapter = null!;
        this.messageFactory = null!;
        this.incomingFactory = null!;
    }
}

