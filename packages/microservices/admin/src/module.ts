import { Module } from '@tsdi/ioc';
import { InMemoryWorkflowDefinitionStore } from '@tsdi/activities';
import { GATEWAY_RULES_STORE } from './controller';

/**
 * Providers for the visual microservice admin console.
 *
 * `GatewayAdminController` must be declared by the host gateway module, because
 * `@Controller` routes are resolved against the module that owns the HTTP
 * transport/router feature.
 *
 * ```ts
 * @Module({
 *   imports: [LoggerModule, GatewayAdminModule],
 *   declarations: [GatewayAdminController],
 *   providers: [
 *     provideService(
 *       useRouter(),
 *       useJson(),
 *       useGateway({ routes }),
 *       useGatewayAdminUi({ root: path.join(__dirname, 'admin-ui') }),
 *       useHttpTransport({ listenOpts: { port: 3000 }, asDefault: true })
 *     )
 *   ]
 * })
 * export class AppModule {}
 * ```
 *
 * Hosts that need persistence can provide `GATEWAY_RULES_STORE` (for example a
 * SQLite-backed `WorkflowDefinitionStore`) before/alongside this module.
 */
@Module({
    providers: [
        { provide: GATEWAY_RULES_STORE, useClass: InMemoryWorkflowDefinitionStore }
    ]
})
export class GatewayAdminModule {}
