import * as path from 'node:path';
import { Application } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useJson, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http-microservice';
import { useGateway } from '@tsdi/gateway';
import { GatewayAdminController, GATEWAY_RULES_STORE, useGatewayAdminUi } from '../src/controller';
import { InMemoryWorkflowDefinitionStore } from '@tsdi/activities';

const PORT = Number(process.argv[2] || process.env.GATEWAY_ADMIN_PORT || 4318);

@Module({
    imports: [LoggerModule],
    declarations: [GatewayAdminController],
    providers: [
        { provide: GATEWAY_RULES_STORE, useClass: InMemoryWorkflowDefinitionStore },
        provideService(
            useRouter(),
            useJson(),
            useGateway({
                routes: [{
                    path: '/api/demo',
                    service: 'demo-service',
                    targetUrl: 'http://127.0.0.1:3999',
                    stripPrefix: true
                }]
            }),
            useGatewayAdminUi({
                root: path.resolve(__dirname),
                prefix: '/admin'
            }),
            useHttpTransport({
                listenOpts: { host: '127.0.0.1', port: PORT },
                asDefault: true
            })
        )
    ]
})
class GatewayAdminPreviewModule {}

Application.run(GatewayAdminPreviewModule).catch(error => {
    console.error(error);
    process.exit(1);
});
