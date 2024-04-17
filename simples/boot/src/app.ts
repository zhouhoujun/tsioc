import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { HttpModule } from '@tsdi/http';
import { TransactionModule } from '@tsdi/repository';
import { BodyparserInterceptor, ContentInterceptor, EndpointModule, JsonInterceptor } from '@tsdi/endpoints';

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

