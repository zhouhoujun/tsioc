import {
    CompositeHandle, AnnoationContext, RegisterModuleHandle, RegisterImportsHandle,
    RegisterModuleExportsHandle, RegisterModuleResolverHandle,
    RegisterExportsHandle, RegisterModuleRegisterHandle, CheckAnnoHandle, ModuleContainerHandle
} from '../handles';
import { Singleton, Autorun } from '@ts-ioc/ioc';
import { AnnoationLifeScope } from './AnnoationLifeScope';

@Singleton
@Autorun('setup')
export class ModuleInjectLifeScope extends CompositeHandle<AnnoationContext> {
    setup() {
        this.use(AnnoationLifeScope)
            .use(CheckAnnoHandle)
            .use(ModuleContainerHandle)
            .use(RegisterModuleHandle)
            .use(RegisterImportsHandle)
            .use(RegisterModuleExportsHandle)
            .use(RegisterModuleResolverHandle)
            .use(RegisterExportsHandle)
            .use(RegisterModuleRegisterHandle);
    }
}
