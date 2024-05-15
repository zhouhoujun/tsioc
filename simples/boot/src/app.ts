import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { ServerModule } from '@tsdi/platform-server';
import { BodyparserInterceptor, ContentInterceptor, EndpointModule, JsonInterceptor } from '@tsdi/endpoints';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { TransactionModule } from '@tsdi/repository';

// default load controllers form folder './controllers'
@Module({
    // baseURL: __dirname,
    imports: [
        LoggerModule,
        ServerModule,
        ServerEndpointModule,
        EndpointModule.register({
            transport: 'http',
            serverOpts: {
                interceptors:[
                    ContentInterceptor,
                    JsonInterceptor,
                    BodyparserInterceptor
                ]
            }
        }),
        TransactionModule,
        TypeOrmModule
    ]
})
export class MockTransBootTest {

}

