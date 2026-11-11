import { ActivatedRouteSnapshot, CanActivate, Route, Router, Routes } from '@tsdi/components/router';

export interface WorkflowAdminUiRouterOptions {
    /** Route guard from `@tsdi/components/router`. */
    guard: CanActivate | ((snapshot: ActivatedRouteSnapshot) => boolean | Promise<boolean>);
    /** Override for tests / non-browser hosts. */
    initialUrl?: string;
    /** Route table override. Defaults to {@link createWorkflowAdminRoutes}. */
    routes?: Routes;
    /** Login page URL. Defaults to `/login.html`. */
    loginUrl?: string;
}

export interface WorkflowAdminRouteOptions {
    /** Login route path. Defaults to `login`. */
    loginPath?: string;
    /** Workflow detail route path. Defaults to `workflows/:id`. */
    workflowPath?: string;
}

/**
 * Default UI route table. Login is public so the guard can redirect to it;
 * every other route is protected by the session guard configured by
 * {@link WorkflowAdminUiRouter}.
 */
export function createWorkflowAdminRoutes(options: WorkflowAdminRouteOptions = {}): Routes {
    const loginPath = options.loginPath || 'login';
    const workflowPath = options.workflowPath || 'workflows/:id';
    return [
        { path: loginPath, data: { login: true, public: true } },
        { path: '', pathMatch: 'full' },
        { path: workflowPath },
        { path: '**', redirectTo: '/' }
    ];
}

/**
 * Hash based UI router for the admin shell, built on `@tsdi/components/router`.
 *
 * Routes:
 *   #/                 open the persisted workflow tabs
 *   #/workflows/:id    activate/open a workflow
 *   #/login            login page
 *
 * Routes come from `options.routes` (default {@link createWorkflowAdminRoutes})
 * so hosts can extend or replace them without changing this class.
 */
export class WorkflowAdminUiRouter {
    readonly router: Router;
    readonly loginUrl: string;
    protected readonly initialUrl: string;

    constructor(protected readonly options: WorkflowAdminUiRouterOptions) {
        this.loginUrl = options.loginUrl || '/login.html';
        this.initialUrl = options.initialUrl ?? this.currentUrl();
        const guard = (snapshot: ActivatedRouteSnapshot) =>
            typeof this.options.guard === 'function'
                ? this.options.guard(snapshot)
                : this.options.guard.canActivate(snapshot);
        const routes = (options.routes || createWorkflowAdminRoutes()).map(route => this.guardRoute(route, guard));
        this.router = new Router(routes, this.initialUrl);
    }

    get workflowId(): string | undefined {
        return this.router.params?.id;
    }

    get loginRoute(): boolean {
        return this.router.data?.login === true;
    }

    currentUrl(): string {
        if (typeof location === 'undefined') {
            return this.initialUrl || '/';
        }
        const hash = String(location.hash || '').replace(/^#/, '');
        return hash || '/';
    }

    async start(): Promise<boolean> {
        return this.router.navigateByUrl(this.initialUrl);
    }

    async navigateTo(url: string): Promise<boolean> {
        return this.router.navigateByUrl(url);
    }

    /** Keep the address bar in sync with the active workflow tab. */
    syncWorkflow(id?: string): void {
        if (typeof history === 'undefined' || typeof location === 'undefined') {
            return;
        }
        const workflowPath = this.workflowPath();
        const hash = id ? `#/${workflowPath.replace(':id', encodeURIComponent(id))}` : '#/';
        if (location.hash !== hash) {
            history.replaceState(null, '', hash);
        }
    }

    watch(onRoute: () => void | Promise<void>): () => void {
        if (typeof window === 'undefined') {
            return () => undefined;
        }
        const handler = async () => {
            if (await this.router.navigateByUrl(this.currentUrl())) {
                await onRoute();
            }
        };
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }

    protected workflowPath(): string {
        return (this.options.routes || createWorkflowAdminRoutes())
            .find(route => route.path?.includes(':id'))?.path
            || 'workflows/:id';
    }

    protected guardRoute(route: Route, guard: (snapshot: ActivatedRouteSnapshot) => boolean | Promise<boolean>): Route {
        if (route.path === 'login') {
            return { ...route, data: { login: true, public: true, ...(route.data || {}) } };
        }
        if (route.redirectTo !== undefined || route.data?.public === true) {
            return { ...route };
        }
        return {
            ...route,
            canActivate: [...(route.canActivate || []), guard],
            children: route.children?.map(child => this.guardRoute(child, guard))
        };
    }

    protected redirectTarget(): string {
        if (typeof location === 'undefined') {
            return this.initialUrl || '/';
        }
        return `${location.pathname}${location.search}${location.hash || '#/'}`;
    }
}
