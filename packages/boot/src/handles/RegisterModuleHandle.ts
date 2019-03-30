import { Singleton, Autorun } from '@tsdi/ioc';
import { RegisterModuleRegisterHandle } from './RegisterModuleRegisterHandle';
import { AnnoationContext, CompositeHandle } from '../core';
import { RegisterAnnoationHandle } from './RegisterAnnoationHandle';

@Singleton
@Autorun('setup')
export class RegisterModuleHandle extends CompositeHandle<AnnoationContext> {


    setup() {
        this.use(RegisterAnnoationHandle)
            .use(RegisterModuleRegisterHandle);
    }
}
