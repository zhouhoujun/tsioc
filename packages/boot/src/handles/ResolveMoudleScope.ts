import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle } from '../core';
import { BootContext } from '../BootContext';
import { DecoratorBuildHandle } from './DecoratorBuildHandle';
import { ResolveModuleHandle } from './ResolveModuleHandle';
import { BuildModuleHandle } from './BuildModuleHandle';

@Singleton
@Autorun('setup')
export class ResolveMoudleScope extends CompositeHandle<BootContext> {
    setup() {
        this.use(ResolveModuleHandle)
            .use(BuildModuleHandle)
            .use(DecoratorBuildHandle);
    }
}
