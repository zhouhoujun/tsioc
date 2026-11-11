import * as path from 'node:path';
import { OIDCService, provideOIDC } from '@tsdi/oidc-auth';
import {
    createWorkflowHttpModule,
    startWorkflowHttpServer,
    WorkflowHttpServerOptions
} from '@tsdi/activities/server';
import { WorkflowAuthController } from './auth/controller';
import {
    resolveWorkflowAdminAuthOptions,
    WORKFLOW_ADMIN_AUTH_OPTIONS,
    WorkflowAdminAuthOptions
} from './auth/options';
import { WorkflowSessionGuard } from './auth/session.guard';

export interface WorkflowAdminServerOptions extends WorkflowHttpServerOptions {
    auth?: WorkflowAdminAuthOptions;
}

function resolveOptions(options: WorkflowAdminServerOptions): WorkflowHttpServerOptions {
    const auth = resolveWorkflowAdminAuthOptions(options.auth, {
        host: options.host,
        port: options.port
    });
    return {
        ...options,
        staticRoot: options.staticRoot || path.resolve(__dirname, '..'),
        cookies: auth.enabled || options.cookies,
        json: true,
        imports: [
            ...(options.imports || [])
        ],
        declarations: [
            WorkflowAuthController,
            ...(options.declarations || [])
        ],
        providers: [
            { provide: WORKFLOW_ADMIN_AUTH_OPTIONS, useValue: auth },
            ...(auth.enabled ? provideOIDC(auth) : [{ provide: OIDCService, useValue: {} as OIDCService }]),
            ...(auth.enabled ? [WorkflowSessionGuard] : []),
            ...(options.providers || [])
        ],
        guards: auth.enabled
            ? [WorkflowSessionGuard, ...(options.guards || [])]
            : (options.guards || [])
    };
}

export function createWorkflowAdminModule(options: WorkflowAdminServerOptions = {}) {
    return createWorkflowHttpModule(resolveOptions(options));
}

export function startWorkflowAdminServer(options: WorkflowAdminServerOptions = {}) {
    return startWorkflowHttpServer(resolveOptions(options));
}
