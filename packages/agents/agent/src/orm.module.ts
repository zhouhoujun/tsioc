import { importProvidersFrom, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { createHash } from 'crypto';
import { LoggerModule } from '@tsdi/logger';
import { DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { TypeOrmModule, TypeormOptions, provideTypeOrm } from '@tsdi/typeorm-adapter';
import { AgentAuditLogEntity, AgentCompactionHistoryEntity, AgentDelegationEdgeEntity, AgentMemoryEntity, AgentMessageEntity, AgentScheduledTaskEntity, AgentSessionEntity, AgentSummaryQualityEntity, AgentTurnDiagnosticsEntity } from './memory/entities';

interface AgentOrmNodeRuntime {
    resolve(...paths: string[]): string;
    join(...paths: string[]): string;
    tmpdir(): string;
    ensureDirectory(path: string): void;
    isWritableDirectory(path: string): boolean;
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
            resolve: (...paths: string[]) => path.resolve(...paths),
            join: (...paths: string[]) => path.join(...paths),
            tmpdir: () => os.tmpdir(),
            ensureDirectory: (target: string) => {
                fs.mkdirSync(target, { recursive: true });
            },
            isWritableDirectory: (target: string) => {
                try {
                    fs.mkdirSync(target, { recursive: true });
                    fs.accessSync(target, fs.constants.W_OK);
                    return true;
                } catch {
                    return false;
                }
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
    const runtime = loadNodeOrmRuntime();
    if (!runtime) {
        return joinOrmPath(root, fileName);
    }
    const resolvedRoot = runtime.resolve(root);
    if (runtime.isWritableDirectory(resolvedRoot)) {
        return runtime.join(resolvedRoot, fileName);
    }
    const fallbackRoot = runtime.join(runtime.tmpdir(), '.tsdi-agent', createHash('sha1').update(resolvedRoot).digest('hex'));
    runtime.ensureDirectory(fallbackRoot);
    return runtime.join(fallbackRoot, fileName);
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
