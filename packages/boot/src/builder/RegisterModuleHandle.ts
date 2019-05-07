import { RegisterModuleRegisterHandle } from './RegisterModuleRegisterHandle';
import { AnnoationContext, CompositeHandle } from '../core';
import { RegisterAnnoationHandle } from './RegisterAnnoationHandle';


export class RegisterModuleHandle extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(RegisterAnnoationHandle)
            .use(RegisterModuleRegisterHandle);
    }
}
