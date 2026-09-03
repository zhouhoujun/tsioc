/**
 * Shared ORM helpers for @tsdi/agent tests.
 *
 * AgentModule no longer imports AgentOrmModule and no longer lazily resolves a
 * TypeormAdapter (no Default* wrappers, no `@Optional` fallback — a missing
 * dependency makes IoC throw). Any code path that needs a durable store must
 * have a real TypeORM connection wired through IoC ("配置 IoC 提供").
 *
 * Tests should boot with `Application.run` (the real runtime path) and resolve
 * stores through the container (`ctx.get(SessionStore)`, ...) rather than
 * constructing stores by hand. `AgentOrmTestApp` composes AgentModule with a
 * real sqljs (in-memory) TypeORM connection via IoC providers, so every TypeOrm
 * store registered against its abstract token resolves through genuine DI.
 */
import { Application, ApplicationContext, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { AgentModule } from '../../src/agent.module';
import { AgentOrmModule } from '../../src/orm.module';

/** A test host module that wires AgentModule with a real sqljs TypeORM connection. */
@Module({
    imports: [
        AgentModule,
        AgentOrmModule.withConnection({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            autoSave: false,
            entities: []
        } as any)
    ],
    providers: [
        { provide: ModuleLoader, useValue: new DefaultModuleLoader() }
    ]
})
export class AgentOrmTestApp {}

/**
 * Boot an ORM-backed application through the real runtime path
 * (`Application.run`). Pass extra providers for per-test overrides.
 */
export async function runAgentOrmApp(extraProviders: any[] = []): Promise<ApplicationContext> {
    return Application.run({
        module: AgentOrmTestApp,
        providers: extraProviders
    });
}
