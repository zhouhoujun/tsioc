import {
    CompositeHandle, AnnoationContext, RegisterExportsHandle,
    RegisterModuleRegisterHandle, CheckAnnoHandle, RegisterScopeHandle
} from '../handles';
import { Singleton, Autorun } from '@ts-ioc/ioc';
import { AnnoationLifeScope } from './AnnoationLifeScope';

@Singleton
@Autorun('setup')
export class ModuleInjectLifeScope extends CompositeHandle<AnnoationContext> {
    setup() {
        this.use(AnnoationLifeScope)
            .use(CheckAnnoHandle)
            .use(RegisterScopeHandle)
            .use(RegisterExportsHandle)
            .use(RegisterModuleRegisterHandle);
    }
}
