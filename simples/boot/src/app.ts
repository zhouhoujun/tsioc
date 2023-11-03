import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { HttpModule } from '@tsdi/http';
import { TransactionModule } from '@tsdi/repository';
import { AssetTransportModule, Bodyparser, Content, Json } from '@tsdi/endpoints/assets';
import { EndpointsModule } from '@tsdi/endpoints';

// default load controllers form folder './controllers'
@Module({
    // baseURL: __dirname,
    imports: [
        LoggerModule,
        ServerModule,
        ServerEndpointModule,
        AssetTransportModule,
        HttpModule,
        EndpointsModule.register({
            transport: 'http',
            serverOpts: {
                interceptors:[
                    Content,
                    Json,
                    Bodyparser
                ]
            }
        }),
        TransactionModule,
        TypeOrmModule
    ]
})
export class MockTransBootTest {

}

