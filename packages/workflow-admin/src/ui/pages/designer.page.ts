import { Component, ViewChild, AfterViewInit } from '@tsdi/components';
import { HttpClient } from '@tsdi/common/http';
import { Router } from '@tsdi/components/router';
import { WorkflowDesignerComponent } from '@tsdi/activities/src/visual/components/workflow-designer.component';
import { WorkflowDesignerModule } from '@tsdi/activities/src/workflow-designer.module';
import { createDefaultWorkflowDefinition } from '@tsdi/activities/src/visual/workflow-designer';
import { HttpWorkflowDefinitionStore } from '@tsdi/activities/src/visual/workflow-store';
import { firstValue } from '../http';
import { WORKFLOW_ADMIN_WORKFLOW_PATH, WORKFLOW_ADMIN_WORKFLOWS_PATH } from '../routes';

@Component({
    selector: 'workflow-admin-designer',
    imports: [WorkflowDesignerModule],
    template: '<workflow-designer #designer></workflow-designer>'
})
export class WorkflowAdminDesignerPageComponent implements AfterViewInit {
    @ViewChild('designer', WorkflowDesignerComponent) designer?: WorkflowDesignerComponent;

    constructor(
        private readonly http: HttpClient,
        private readonly router: Router
    ) { }

    async onAfterViewInit(): Promise<void> {
        const designer = this.designer;
        if (!designer) {
            return;
        }
        designer.store = new HttpWorkflowDefinitionStore({ baseUrl: '/api' });
        designer.autosave = true;
        designer.autosaveDelay = 1200;
        designer.autosaveMinInterval = 3000;
        designer.autosaveMaxDelay = 15000;

        const tabsKey = 'workflow-designer-open-tabs';
        // Keep the initial `#/workflows` landing URL stable; deep links are only
        // written once the user actually switches/open documents.
        let syncRouteEnabled = false;
        designer.tabChangeAction = state => {
            if (syncRouteEnabled) {
                this.syncRoute(state.activeId);
            }
            try {
                localStorage.setItem(tabsKey, JSON.stringify(state));
            } catch {
                // Private mode/quota failures must not break the editor.
            }
        };

        let restoredTabs = false;
        try {
            const savedTabs = JSON.parse(localStorage.getItem(tabsKey) || 'null');
            if (savedTabs?.openIds?.length) {
                restoredTabs = await designer.restoreWorkflowTabs(savedTabs.openIds, savedTabs.activeId);
            }
        } catch {
            restoredTabs = false;
        }
        if (!restoredTabs) {
            const tabs = designer.workflowTabSource.items;
            designer.tabChangeAction?.({
                openIds: tabs.map(tab => tab.id),
                activeId: tabs.find(tab => tab.active)?.id
            });
        }

        try {
            const catalog = await firstValue(this.http.get<{ installed?: Array<{ nodes?: any[] }> }>('/api/plugins'));
            for (const plugin of catalog?.installed || []) {
                for (const node of plugin?.nodes || []) {
                    designer.designer.registry.register(node);
                }
            }
        } catch {
            // The admin can run without the plugin API.
        }

        const routeId = this.router.params?.['id'];
        if (routeId) {
            await designer.loadWorkflow(routeId);
            this.syncRoute(routeId);
        }
        syncRouteEnabled = true;

        const fitSoon = () => {
            const run = () => designer.fitView();
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(run);
            } else {
                run();
            }
        };
        fitSoon();

        const locale = localStorage.getItem('workflow-designer-locale')
            || localStorage.getItem('workflow-demo-locale')
            || 'en';
        const applyLocale = (next: 'en' | 'zh-CN') => {
            designer.locale = next;
            if (!restoredTabs && designer.openWorkflowCount === 1 && !designer.designer.dirty) {
                designer.designer.load(createDefaultWorkflowDefinition(designer.designer.registry, next));
                fitSoon();
            }
            localStorage.setItem('workflow-designer-locale', next);
        };
        applyLocale(locale === 'zh-CN' ? 'zh-CN' : 'en');
        designer.localeChangeAction = applyLocale;

        const savedTheme = localStorage.getItem('workflow-designer-theme')
            || localStorage.getItem('workflow-demo-theme');
        if (savedTheme) {
            designer.setTheme(savedTheme as any);
        }
        designer.themeChangeAction = theme => localStorage.setItem('workflow-designer-theme', String(theme));

        const authUser = document.getElementById('auth-user');
        const authName = document.getElementById('auth-name');
        try {
            const session = await firstValue(this.http.get<{ user?: any }>('/auth/session', { withCredentials: true }));
            if (session?.user) {
                const user = session.user;
                const name = user.displayName || user.username || user.email || 'User';
                // Versions and releases record who saved/published them.
                designer.designer.author = name;
                if (authUser && authName) {
                    authName.textContent = name;
                    authUser.hidden = false;
                }
            }
        } catch {
            // Authentication-disabled and anonymous deployments hide the chip.
        }
        document.getElementById('logout')?.addEventListener('click', () => {
            location.href = '/auth/logout';
        });

        (window as any).workflowDesigner = designer;
        (window as any).setWorkflowLocale = applyLocale;
    }

    private syncRoute(id?: string): void {
        if (typeof history === 'undefined' || typeof location === 'undefined') {
            return;
        }
        // A tab/route sync must not overwrite an explicit navigation to another
        // route (for example the NotFound page).
        const current = String(location.hash || '').replace(/^#/, '') || '/';
        const base = `/${WORKFLOW_ADMIN_WORKFLOWS_PATH}`;
        if (current !== '/' && current !== base && !current.startsWith(`${base}/`)) {
            return;
        }
        const hash = id
            ? `#/${WORKFLOW_ADMIN_WORKFLOW_PATH.replace(':id', encodeURIComponent(id))}`
            : `#${base}`;
        if (location.hash !== hash) {
            history.replaceState(null, '', hash);
        }
    }
}
