import {
    CompositeHandle, AnnoationContext, CheckAnnoHandle,
    RegisterScopeHandle, RegisterChildModuleHandle
} from '../handles';
import { Singleton, Autorun } from '@tsdi/ioc';
import { AnnoationLifeScope } from './AnnoationLifeScope';

@Singleton
@Autorun('setup')
export class ModuleInjectLifeScope extends CompositeHandle<AnnoationContext> {
    setup() {
        this.use(AnnoationLifeScope)
            .use(CheckAnnoHandle)
            .use(RegisterScopeHandle)
            .use(RegisterChildModuleHandle);
    }
}
