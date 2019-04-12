import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle, AnnoationContext } from '../core';
import {
    ResolveRunnableHandle, ResolveBootstrapHandle, RunBootHandle, ModuleBuildHandle
} from '../handles';

@Singleton
@Autorun('setup')
export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(ModuleBuildHandle)
            .use(ResolveBootstrapHandle)
            .use(ResolveRunnableHandle)
            .use(RunBootHandle);
    }
}
