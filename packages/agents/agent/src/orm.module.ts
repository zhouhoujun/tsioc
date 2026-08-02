import { importProvidersFrom, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
import { LoggerModule } from '@tsdi/logger';
import { DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { TypeOrmModule, TypeormOptions, provideTypeOrm } from '@tsdi/typeorm-adapter';
import { AgentAuditLogEntity, AgentCompactionHistoryEntity, AgentDelegationEdgeEntity, AgentMemoryEntity, AgentMessageEntity, AgentScheduledTaskEntity, AgentSessionEntity, AgentSummaryQualityEntity, AgentTurnDiagnosticsEntity } from './memory/entities';



@Module({
    imports: [
        TypeOrmModule.withConnection({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            entities: [AgentSessionEntity, AgentMessageEntity, AgentMemoryEntity, AgentScheduledTaskEntity, AgentAuditLogEntity, AgentCompactionHistoryEntity, AgentTurnDiagnosticsEntity, AgentSummaryQualityEntity, AgentDelegationEdgeEntity]
        } as TypeormOptions)
    ]
})
export class AgentOrmModule {
    static withConnection(options: TypeormOptions): ModuleWithProviders<AgentOrmModule> {
        return {
            module: AgentOrmModule,
            providers: createAgentOrmProviders(options)
        }
    }

    static withStorageRoot(root: string, fileName = 'agent.db'): ModuleWithProviders<AgentOrmModule> {
        const location = resolveAgentOrmStorageLocation(root, fileName);
        return AgentOrmModule.withConnection({
            type: 'sqljs' as any,
            location,
            autoSave: true,
            autoLoadEntities: false as any,
            synchronize: true
        } as TypeormOptions);
    }
}

export function provideAgentOrmStorage(root: string, fileName = 'agent.db'): Provider[] {
    const location = resolveAgentOrmStorageLocation(root, fileName);
    return provideAgentOrm({
        type: 'sqljs' as any,
        location,
        autoSave: true,
        autoLoadEntities: false as any,
        synchronize: true
    } as TypeormOptions);
}

function resolveAgentOrmStorageLocation(root: string, fileName: string): string {
    const resolvedRoot = path.resolve(root);
    try {
        fs.mkdirSync(resolvedRoot, { recursive: true });
        fs.accessSync(resolvedRoot, fs.constants.W_OK);
        return path.join(resolvedRoot, fileName);
    } catch {
        const fallbackRoot = path.join(os.tmpdir(), '.tsdi-agent', createHash('sha1').update(resolvedRoot).digest('hex'));
        fs.mkdirSync(fallbackRoot, { recursive: true });
        return path.join(fallbackRoot, fileName);
    }
}


function createAgentOrmProviders(options: TypeormOptions): Provider[] {
    options.entities ??= [];
    options.entities.push(AgentSessionEntity, AgentMessageEntity, AgentMemoryEntity, AgentScheduledTaskEntity, AgentAuditLogEntity, AgentCompactionHistoryEntity, AgentTurnDiagnosticsEntity, AgentSummaryQualityEntity, AgentDelegationEdgeEntity);
    return provideTypeOrm(options);
}

export function provideAgentOrm(options: TypeormOptions): Provider[] {
    return [
        importProvidersFrom(LoggerModule),
        { provide: ModuleLoader, useValue: new DefaultModuleLoader() },
        ...createAgentOrmProviders({
        type: 'sqljs' as any,
        autoLoadEntities: false as any,
        synchronize: true,
        ...options
    })
    ];
}
