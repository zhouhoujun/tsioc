import { Singleton, Autorun } from '@ts-ioc/ioc';
import { CompositeHandle, AnnoationContext, ModuleInjectLifeScope } from '../core';
import {
    BootContextCheckHandle, BootDepsHandle, BootProvidersHandle,
    ResolveModuleHandle, ResolveRunnableHandle, ResolveBootstrapHandle,
    RunBootHandle, BootConfigureLoadHandle, BootConfigureRegisterHandle
} from '../handles';

@Singleton
@Autorun('setup')
export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(BootContextCheckHandle)
            .use(BootProvidersHandle)
            .use(BootDepsHandle)
            .use(BootConfigureLoadHandle)
            .use(ModuleInjectLifeScope)
            .use(BootConfigureRegisterHandle)
            .use(ResolveModuleHandle)
            .use(ResolveBootstrapHandle)
            .use(ResolveRunnableHandle)
            .use(RunBootHandle);
    }
}
