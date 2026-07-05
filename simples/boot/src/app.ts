import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { ServerModule } from '@tsdi/platform-server';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { TypeOrmModule } from '@tsdi/typeorm-adapter';
import { TransactionModule } from '@tsdi/repository';
import { provideService, useCors, useJson, useLogger, useRouter, useStatics } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http';
import { provideSwagger, SwaggerModule } from '@tsdi/swagger';
import { Transport } from '@tsdi/common';

// default load controllers form folder './controllers'
@Module({
    // baseURL: __dirname,
    imports: [
        LoggerModule,
        ServerModule,
        ServerCommonModule,
        // EndpointModule.register({
        //     transport: 'http',
        //     serverOpts: {
        //         interceptors:[
        //             ContentInterceptor,
        //             JsonInterceptor,
        //             BodyparserInterceptor
        //         ]
        //     }
        // }),
        TransactionModule,
        TypeOrmModule
    ],
    providers:[
        provideService(
            useLogger(),
            useCors(),
            useRouter(),
            useStatics(),
            useJson(),
            useHttpTransport({ listenOpts: { port: 3000, host: '127.0.0.1' } }),
        ),
        provideSwagger({
            title: 'api document',
            description: 'platform basic api',
            version: 'v1',
            prefix: 'api-doc',
            transport: Transport.HTTP
        }),  
    ]
})
export class MockTransBootTest {

}

