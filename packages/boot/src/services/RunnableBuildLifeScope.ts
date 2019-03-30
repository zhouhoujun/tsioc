import { Singleton, Autorun } from '@tsdi/ioc';
import { CompositeHandle, AnnoationContext } from '../core';
import {
    BootContextCheckHandle, BootDepsHandle, BootProvidersHandle,
    ResolveModuleHandle, ResolveRunnableHandle, ResolveBootstrapHandle,
    RunBootHandle, BootConfigureLoadHandle, BootConfigureRegisterHandle, RegisterChildModuleHandle, RegisterAnnoationHandle
} from '../handles';

@Singleton
@Autorun('setup')
export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(BootContextCheckHandle)
            .use(BootProvidersHandle)
            .use(BootDepsHandle)
            .use(BootConfigureLoadHandle)
            .use(RegisterAnnoationHandle)
            .use(RegisterChildModuleHandle)
            .use(BootConfigureRegisterHandle)
            .use(ResolveModuleHandle)
            .use(ResolveBootstrapHandle)
            .use(ResolveRunnableHandle)
            .use(RunBootHandle);
    }
}
