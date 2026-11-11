import { Inject, Injectable, token } from '@tsdi/ioc';
import { BadRequestException, NotFoundException } from '@tsdi/common';
import { Controller, Delete, Get, Post, Put, RequestBody, RequestPath, ServiceFeatureFn, ServiceFeatureKind, useStatics } from '@tsdi/service';
import { GatewayOptions, GatewayRouteOptions, GatewayRuleOptions, GatewayRuntime, GATEWAY_OPTIONS } from '@tsdi/gateway';
import {
    InMemoryWorkflowDefinitionStore,
    VisualWorkflowDefinition,
    WorkflowDefinitionStore
} from '@tsdi/activities';
import { compileGatewayRules } from './rules';

/**
 * Store used for visual gateway rule documents. Defaults to an in-memory store;
 * hosts can override it with a persistent implementation.
 */
export const GATEWAY_RULES_STORE = token<WorkflowDefinitionStore>('GATEWAY_RULES_STORE');

export interface GatewayAdminState {
    routes: GatewayRouteOptions[];
    rules: GatewayRuleOptions[];
    services: string[];
    dynamic: Partial<GatewayOptions>;
}

function uniqueServices(routes: GatewayRouteOptions[], rules: GatewayRuleOptions[]): string[] {
    const services = new Set<string>();
    routes.forEach(route => route.service && services.add(route.service));
    rules.forEach(rule => rule.action?.service && services.add(rule.action.service));
    return Array.from(services).sort();
}

/**
 * HTTP API for the visual microservice admin console.
 *
 * Mount this controller inside the gateway process so applying rules updates
 * the live `GatewayRuntime` immediately.
 */
@Controller('/api/gateway-admin')
@Injectable()
export class GatewayAdminController {
    constructor(
        private runtime: GatewayRuntime,
        @Inject(GATEWAY_OPTIONS, { nullable: true }) private options?: GatewayOptions,
        @Inject(GATEWAY_RULES_STORE, { nullable: true }) private store?: WorkflowDefinitionStore
    ) {
        this.store = store ?? new InMemoryWorkflowDefinitionStore();
    }

    @Get('/')
    state(): GatewayAdminState {
        return this.snapshot();
    }

    @Get('/state')
    getState(): GatewayAdminState {
        return this.snapshot();
    }

    @Put('/routes')
    updateRoutes(@RequestBody() body: { routes?: GatewayRouteOptions[] } | GatewayRouteOptions[]) {
        const routes = Array.isArray(body) ? body : body?.routes;
        if (!Array.isArray(routes)) {
            throw new BadRequestException('routes array is required');
        }
        this.runtime.setDynamicOptions({
            ...this.runtime.getDynamicOptions(),
            routes
        });
        return this.snapshot();
    }

    @Delete('/routes')
    resetRoutes() {
        const dynamic = { ...this.runtime.getDynamicOptions() };
        delete dynamic.routes;
        this.runtime.setDynamicOptions(dynamic);
        return this.snapshot();
    }

    @Get('/rules')
    listRules() {
        return this.store!.list();
    }

    @Get('/rules/:id')
    async getRule(@RequestPath('id') id: string) {
        const definition = await this.store!.get(id);
        if (!definition) {
            throw new NotFoundException(`Gateway rule workflow not found: ${id}`);
        }
        return definition;
    }

    @Put('/rules/:id')
    async saveRule(@RequestPath('id') id: string, @RequestBody() body: VisualWorkflowDefinition) {
        if (!body || typeof body !== 'object') {
            throw new BadRequestException('workflow definition body is required');
        }
        const definition: VisualWorkflowDefinition = { ...body, id };
        const compiled = compileGatewayRules(definition);
        if (compiled.errors.length) {
            throw new BadRequestException(compiled.errors.join('; '));
        }
        const summary = await this.store!.save(definition);
        this.applyRules(compiled.rules);
        return { summary, definition, rules: compiled.rules };
    }

    @Post('/rules/:id/apply')
    async applyRule(@RequestPath('id') id: string) {
        const definition = await this.store!.get(id);
        if (!definition) {
            throw new NotFoundException(`Gateway rule workflow not found: ${id}`);
        }
        return this.compileAndApply(definition);
    }

    @Post('/rules/apply')
    compileOnly(@RequestBody() body: VisualWorkflowDefinition) {
        if (!body || typeof body !== 'object') {
            throw new BadRequestException('workflow definition body is required');
        }
        const compiled = compileGatewayRules(body);
        if (compiled.errors.length) {
            throw new BadRequestException(compiled.errors.join('; '));
        }
        return { rules: compiled.rules };
    }

    @Delete('/rules/:id')
    async removeRule(@RequestPath('id') id: string) {
        const removed = await this.store!.remove(id);
        if (!removed) {
            throw new NotFoundException(`Gateway rule workflow not found: ${id}`);
        }
        return { removed: true };
    }

    private compileAndApply(definition: VisualWorkflowDefinition) {
        const compiled = compileGatewayRules(definition);
        if (compiled.errors.length) {
            throw new BadRequestException(compiled.errors.join('; '));
        }
        this.applyRules(compiled.rules);
        return { definition, rules: compiled.rules };
    }

    private applyRules(rules: GatewayRuleOptions[]): void {
        this.runtime.setDynamicOptions({
            ...this.runtime.getDynamicOptions(),
            rules
        });
    }

    private snapshot(): GatewayAdminState {
        const routes = this.runtime.getRoutes(this.options?.routes ?? []);
        const rules = this.runtime.getRules(this.options?.rules ?? []);
        return {
            routes,
            rules,
            services: uniqueServices(routes, rules),
            dynamic: this.runtime.getDynamicOptions()
        };
    }
}

export interface GatewayAdminUiOptions {
    /** Directory containing the built admin UI (index.html + assets). */
    root: string;
    /** Static URL prefix. Default `/admin`. */
    prefix?: string;
}

/**
 * Serve the built admin UI from a gateway application.
 *
 * ```ts
 * provideService(
 *   useRouter(),
 *   useJson(),
 *   useGateway({ routes }),
 *   useGatewayAdminUi({ root: path.join(__dirname, 'admin-ui') }),
 *   useHttpTransport({ listenOpts: { port: 3000 }, asDefault: true })
 * )
 * ```
 */
export function useGatewayAdminUi(options: GatewayAdminUiOptions): ServiceFeatureFn<ServiceFeatureKind.Content> {
    const prefix = (options.prefix ?? '/admin').replace(/^\/+/, '');
    return useStatics({
        root: options.root,
        prefix,
        // Serve the absolute `root` as-is; inheriting the app baseURL would
        // prepend it to the absolute path and break file resolution.
        baseUrl: false
    });
}
