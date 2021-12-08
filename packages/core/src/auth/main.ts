import { Module } from '../metadata/decor';
import { AuthorizationAspect } from './aspect';

@Module({
    providers: [
        AuthorizationAspect
    ]
})
export class AuthorizationModule {

}
