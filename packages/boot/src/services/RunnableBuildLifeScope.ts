import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle, AnnoationContext } from '../core';
import {
    ResolveRunnableHandle, RunBootHandle, BootBuildScope
} from '../handles';

@Singleton
@Autorun('setup')
export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(BootBuildScope)
            .use(ResolveRunnableHandle)
            .use(RunBootHandle);
    }
}
