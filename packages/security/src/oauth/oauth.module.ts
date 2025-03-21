import { Module } from '@tsdi/ioc';
import { JWTModule } from '../jwt';

@Module({
    imports: [
        JWTModule
    ],
    providers: [
        
    ]
})
export class OAuthModule {

}
