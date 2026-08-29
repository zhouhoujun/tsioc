import { importProvidersFrom, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { TypeOrmModule, TypeormOptions, provideTypeOrm } from '@tsdi/typeorm-adapter';
import { AgentAuditLogEntity, AgentCompactionHistoryEntity, AgentDelegationEdgeEntity, AgentGoalEntity, AgentMemoryEntity, AgentMessageEntity, AgentScheduledTaskEntity, AgentSessionEntity, AgentSessionSnapshotEntity, AgentSummaryQualityEntity, AgentTimelineEventEntity, AgentTurnDiagnosticsEntity } from './memory/entities';

interface AgentOrmNodeRuntime {
    join(...paths: string[]): string;
    homedir(): string;
    ensureDirectory(path: string): void;
}

function normalizeOrmPath(input: string): string {
    let value = String(input || '').trim().replace(/\\/g, '/');
    if (!value) {
        return '';
    }
    const hadUncPrefix = value.startsWith('//');
    value = value.replace(/\/+/g, '/');
    if (hadUncPrefix) {
        value = `//${value.replace(/^\/+/, '')}`;
    }
    if (value !== '/' && !/^[a-zA-Z]:\/$/i.test(value)) {
        value = value.replace(/\/+$/, '');
    }
    return value;
}

function joinOrmPath(base: string, fileName: string): string {
    const normalizedBase = normalizeOrmPath(base);
    const normalizedFile = String(fileName || '').replace(/^[\\/]+/, '');
    if (!normalizedBase) {
        return normalizedFile;
    }
    if (!normalizedFile) {
        return normalizedBase;
    }
    return normalizedBase.endsWith('/')
        ? `${normalizedBase}${normalizedFile}`
        : `${normalizedBase}/${normalizedFile}`;
}

function loadNodeOrmRuntime(): AgentOrmNodeRuntime | null {
    try {
        const req = typeof require === 'function' ? require : null;
        if (!req) {
            return null;
        }
        const fs = req('fs');
        const path = req('path');
        const os = req('os');
        return {
            join: (...paths: string[]) => path.join(...paths),
            homedir: () => process.env.HOME || os.homedir(),
            ensureDirectory: (target: string) => {
                fs.mkdirSync(target, { recursive: true });
            }
        };
    } catch {
        return null;
    }
}



@Module({
    imports: [
        TypeOrmModule.withConnection({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            entities: [AgentSessionEntity, AgentSessionSnapshotEntity, AgentMessageEntity, AgentMemoryEntity, AgentScheduledTaskEntity, AgentAuditLogEntity, AgentCompactionHistoryEntity, AgentTurnDiagnosticsEntity, AgentSummaryQualityEntity, AgentDelegationEdgeEntity, AgentGoalEntity, AgentTimelineEventEntity]
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
    const runtime = loadNodeOrmRuntime();
    if (!runtime) {
        return joinOrmPath('~/.tsdi-agent', 'agent.db');
    }
    const storageRoot = runtime.join(runtime.homedir(), '.tsdi-agent');
    runtime.ensureDirectory(storageRoot);
    return runtime.join(storageRoot, 'agent.db');
}


function createAgentOrmProviders(options: TypeormOptions): Provider[] {
    options.entities ??= [];
    options.entities.push(AgentSessionEntity, AgentSessionSnapshotEntity, AgentMessageEntity, AgentMemoryEntity, AgentScheduledTaskEntity, AgentAuditLogEntity, AgentCompactionHistoryEntity, AgentTurnDiagnosticsEntity, AgentSummaryQualityEntity, AgentDelegationEdgeEntity, AgentGoalEntity, AgentTimelineEventEntity);
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
