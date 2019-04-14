import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle, AnnoationContext } from '../core';
import {
    ResolveRunnableHandle, ResolveBootstrapHandle, RunBootHandle, ModuleBuildScope
} from '../handles';

@Singleton
@Autorun('setup')
export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(ModuleBuildScope)
            .use(ResolveBootstrapHandle)
            .use(ResolveRunnableHandle)
            .use(RunBootHandle);
    }
}
