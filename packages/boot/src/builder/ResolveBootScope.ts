import { CompositeHandle } from '../core';
import { BootContext } from '../BootContext';
import { ResolveBootHandle } from './ResolveBootHandle';
import { BootDecoratorBuildHandle } from './DecoratorBuildHandle';

export class ResolveBootScope extends CompositeHandle<BootContext> {
    setup() {
        this.use(ResolveBootHandle)
            .use(BootDecoratorBuildHandle);
    }
}
