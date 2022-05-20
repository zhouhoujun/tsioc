import { Module } from '@tsdi/core';
import { AuthorizationAspect } from './aspect';

@Module({
    providers: [
        AuthorizationAspect
    ]
})
export class AuthorizationModule {

}
