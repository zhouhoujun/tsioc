import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle } from '../core';
import { BootContext } from '../BootContext';
import { ResolveBootHandle } from './ResolveBootHandle';
import { BootDecoratorBuildHandle } from './DecoratorBuildHandle';

@Singleton
@Autorun('setup')
export class ResolveBootScope extends CompositeHandle<BootContext> {
    setup() {
        this.use(ResolveBootHandle)
            .use(BootDecoratorBuildHandle);
    }
}
