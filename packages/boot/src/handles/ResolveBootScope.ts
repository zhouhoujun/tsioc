import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle } from '../core';
import { BootContext } from '../BootContext';
import { ResolveBootstrapHandle } from './ResolveBootstrapHandle';

@Singleton
@Autorun('setup')
export class ResolveBootScope extends CompositeHandle<BootContext> {
    setup() {
        this.use(ResolveBootstrapHandle);
    }
}
