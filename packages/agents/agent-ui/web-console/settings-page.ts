import { Application } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Component, ComponentRef, ComponentsModule, ReactiveEffect, reactive } from '@tsdi/components';
import { Module } from '@tsdi/ioc';
import { HtmlTemplateModule } from '@tsdi/components/html';
import {
    AgentConsoleSessionState,
    AgentConsoleSettingsPageModule
} from '@tsdi/agent-ui';

/**
 * Root of the browser settings page. It is mounted in its own application so
 * the terminal console tree keeps exactly its previous nodes (the TUI gate
 * measures the root's children). The page and the console share the same
 * session-state proxy, so applying a row updates both.
 */
@Component({
    selector: 'agent-web-settings-root',
    imports: [AgentConsoleSettingsPageModule],
    // The page owns its own visibility: the host mounts this shell lazily, and
    // a `v-show` binding inside the page app is what reacts to open/close.
    template: `<agent-console-settings-page></agent-console-settings-page>`
})
export class AgentWebSettingsRootComponent {
    constructor(private state: AgentConsoleSessionState) {
    }
}

@Module({
    imports: [AgentConsoleSettingsPageModule, HtmlTemplateModule, ComponentsModule],
    declarations: [AgentWebSettingsRootComponent],
    exports: [AgentWebSettingsRootComponent]
})
export class AgentWebSettingsPageModule {}

export interface AgentWebSettingsPageHandle {
    element: HTMLElement;
    dispose(): Promise<void>;
}

/**
 * Mount the full-page settings shell into its own container. The console host
 * calls this lazily the first time the sidebar gear (or a host shortcut) opens
 * settings; closing the page only hides it, so reopening is instant.
 */
export async function mountAgentWebSettingsPage(options: {
    document: Document;
    state: AgentConsoleSessionState;
}): Promise<AgentWebSettingsPageHandle> {
    const doc = options.document;
    const container = doc.createElement('div');
    container.className = 'agent-web-settings-mount';
    doc.body.appendChild(container);
    const ctx = await Application.run(AgentWebSettingsRootComponent, {
        deps: [AgentWebSettingsPageModule],
        providers: [
            { provide: DOCUMENT, useValue: doc },
            // A second application must proxy the raw state with its own
            // effect; a reactive-marked raw object would otherwise be used
            // as-is and none of the page bindings would track it.
            {
                provide: AgentConsoleSessionState,
                useFactory: (effect: ReactiveEffect) => reactive(options.state, effect),
                deps: [ReactiveEffect]
            }
        ]
    });
    const ref = ctx.runners.getRef(AgentWebSettingsRootComponent) as ComponentRef<AgentWebSettingsRootComponent> | undefined;
    const root = ref?.hostView?.rootNodes?.[0];
    if (root) {
        container.replaceChildren(root as any);
    } else {
        container.textContent = 'Settings page did not render.';
    }
    return {
        element: container,
        dispose: async () => {
            container.remove();
            await ctx.close();
        }
    };
}
