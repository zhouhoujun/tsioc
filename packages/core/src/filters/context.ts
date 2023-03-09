import { Abstract, DefaultInvocationContext } from '@tsdi/ioc';
import { Endpointor } from './Endpointor';

/**
 * endpoint context.
 */
@Abstract()
export abstract class EndpointContext extends DefaultInvocationContext {
    /**
     * host transport endpoint. instance of {@link TransportEndpoint}.
     */
    abstract get target(): Endpointor;
    /**
     * execption.
     */
    execption?: any;

    protected override clear(): void {
        super.clear();
        (this as any).target = null;
    }

}