import { Module } from '@tsdi/ioc';
import { AuthorizationAspect } from './aspect';

@Module({
    providers: [
        AuthorizationAspect
    ]
})
export class AuthorizationModule {

}
