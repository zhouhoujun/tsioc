import { AgentMessage } from '@tsdi/agent';
import { Inject, Injectable, Injector, Optional, Token, Type, token } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { defaultTimelineLabel, formatAgentUiLabel } from './agent-ui.i18n';
import { AGENT_CONSOLE_MARKDOWN_COMPONENT } from './AgentConsoleMessageComponents';
import { AgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';
import { resolveMessageRoleLabel, resolveMessageRoleStyle } from './AgentConsoleTimelineMeta';
import {
    AgentConsoleContentKind,
    presentAgentConsoleSessionContent
} from './AgentConsoleSessionContentPresenter';
import {
    AgentConsoleApprovalTemplate, AgentConsoleCommandTemplate, AgentConsoleErrorTemplate,
    AgentConsoleFilesTemplate, AgentConsolePlanTemplate, AgentConsoleQuestionTemplate,
    AgentConsoleSystemTemplate, AgentConsoleThoughtTemplate,
    AgentConsoleToolTemplate, AgentConsoleUserTemplate
} from './AgentConsoleMessageTemplates';
import type { AgentConsoleMessageTemplateKind, AgentConsoleResolvedMessageRenderer } from './AgentConsoleMessageRenderers';

/** IoC extension point for content-specific message display. */
export abstract class AgentConsoleMessageRenderer {
    abstract resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse;
}

export interface AgentConsoleMessageRenderRequest {
    message: AgentMessage;
    templateKind: AgentConsoleMessageTemplateKind;
}

export interface AgentConsoleMessageRenderResponse {
    presentation: AgentConsoleResolvedMessageRenderer;
    component: Type<any>;
}

/** Route map follows the shared request router contract: request path -> handler token. */
export type AgentConsoleMessageRendererRoutes = Partial<Record<AgentConsoleContentKind, Token<AgentConsoleMessageRenderer>>>;
export const AGENT_CONSOLE_MESSAGE_RENDERER_ROUTES = token<AgentConsoleMessageRendererRoutes>('AGENT_CONSOLE_MESSAGE_RENDERER_ROUTES');

@Injectable()
export class AgentConsoleMessageRendererRegistry {
    constructor(
        private injector: Injector,
        @Inject(AGENT_CONSOLE_MESSAGE_RENDERER_ROUTES, { defaultValue: {} })
        private routes: AgentConsoleMessageRendererRoutes = {}
    ) {}

    resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const request: AgentConsoleMessageRenderRequest = { message, templateKind };
        const kind = presentAgentConsoleSessionContent(message).kind;
        const route = this.routes[kind];
        const renderer = route && !this.injector.destroyed
            ? this.injector.get(route, undefined)
            : undefined;
        return renderer?.resolve(request.message, request.templateKind) || {
            presentation: resolveBuiltinMessageRenderer(request.templateKind),
            component: AgentConsoleSystemTemplate
        };
    }
}

abstract class AgentConsoleFamilyMessageRenderer extends AgentConsoleMessageRenderer {
    resolve(_message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        return {
            presentation: resolveBuiltinMessageRenderer(templateKind),
            component: AgentConsoleSystemTemplate
        };
    }
}

@Injectable()
export class AgentConsoleUserRenderer extends AgentConsoleFamilyMessageRenderer {
    override resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        return { ...super.resolve(message, templateKind), component: AgentConsoleUserTemplate };
    }
}

@Injectable()
export class AgentConsoleAnswerRenderer extends AgentConsoleFamilyMessageRenderer {
    constructor(@Inject(AGENT_CONSOLE_MARKDOWN_COMPONENT) private markdownComponent: Type<any>) { super(); }
    override resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const presentation = super.resolve(message, templateKind).presentation;
        return { component: this.markdownComponent, presentation: {
            ...presentation,
            roleLabel: '',
            itemStyle: (theme, selected) => ({
                ...presentation.itemStyle(theme, selected),
                margin: '0'
            })
        } };
    }
}

@Injectable()
export class AgentConsolePartialRenderer extends AgentConsoleFamilyMessageRenderer {
    constructor(@Inject(AGENT_CONSOLE_MARKDOWN_COMPONENT) private markdownComponent: Type<any>) { super(); }
    override resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        return { ...super.resolve(message, templateKind), component: this.markdownComponent };
    }
}

@Injectable()
export class AgentConsolePreambleRenderer extends AgentConsoleFamilyMessageRenderer {
    constructor(@Inject(AGENT_CONSOLE_MARKDOWN_COMPONENT) private markdownComponent: Type<any>) { super(); }
    override resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const response = super.resolve(message, templateKind);
        // Preamble is ordinary assistant prose; a `Context ·` label made the
        // same speaker read as two authors (opencode parity).
        return { component: this.markdownComponent, presentation: { ...response.presentation, roleLabel: '' } };
    }
}

@Injectable()
export class AgentConsoleDecisionMessageRenderer extends AgentConsoleFamilyMessageRenderer {
    override resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const response = super.resolve(message, templateKind);
        return { ...response, presentation: { ...response.presentation, roleLabel: 'Decision · ' } };
    }
}

@Injectable()
export class AgentConsoleArtifactMessageRenderer extends AgentConsoleFamilyMessageRenderer {
}

type AgentConsoleKindRendererTone = 'muted' | 'accent' | 'attention' | 'error';

/** IoC route handler for one semantic content kind. */
export abstract class AgentConsoleKindRenderer extends AgentConsoleMessageRenderer {
    constructor(@Optional() @Inject(TranslatorService) protected translator?: TranslatorService) { super(); }
    abstract readonly kind: AgentConsoleContentKind;
    abstract readonly label: string;
    abstract readonly component: Type<any>;
    readonly tone: AgentConsoleKindRendererTone = 'muted';

    resolve(_message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const builtin = resolveBuiltinMessageRenderer(templateKind);
        return { component: this.component, presentation: {
            ...builtin,
            roleLabel: this.label === defaultTimelineLabel(this.kind) ? formatAgentUiLabel(this.translator, `agent.timeline.${this.kind}`, this.label) : this.label,
            roleStyle: theme => ({
                ...styleTextToObject(this.tone === 'error' ? theme.statusErrorValue
                    : this.tone === 'attention' ? theme.statusBusyValue
                        : this.tone === 'accent' ? theme.toolsAccent : theme.statusLabel),
                ...(this.tone === 'muted' ? {} : { 'font-weight': 'bold' })
            }),
            itemStyle: (theme, selected) => ({ ...builtin.itemStyle(theme, selected), margin: '0' })
        } };
    }
}

@Injectable()
export class AgentConsoleThoughtMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'thought' as const;
    readonly label = 'Thought · ';
    readonly component = AgentConsoleThoughtTemplate;
}

@Injectable()
export class AgentConsoleToolMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'tool' as const;
    readonly label = 'Tool · ';
    readonly component = AgentConsoleToolTemplate;
}

@Injectable()
export class AgentConsoleCommandMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'command' as const;
    readonly label = '$ ';
    readonly component = AgentConsoleCommandTemplate;
}

@Injectable()
export class AgentConsolePlanMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'plan' as const;
    // opencode's todo block is titled by its content (`# Todos`), not a role label.
    readonly label = '';
    readonly component = AgentConsolePlanTemplate;
    override readonly tone = 'accent' as const;
}

@Injectable()
export class AgentConsoleFilesMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'file-change' as const;
    readonly label = 'Files · ';
    readonly component = AgentConsoleFilesTemplate;
    override readonly tone = 'accent' as const;
}

@Injectable()
export class AgentConsoleQuestionMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'question' as const;
    readonly label = 'Question · ';
    readonly component = AgentConsoleQuestionTemplate;
    override readonly tone = 'attention' as const;
}

@Injectable()
export class AgentConsoleApprovalMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'approval' as const;
    readonly label = 'Approval · ';
    readonly component = AgentConsoleApprovalTemplate;
    override readonly tone = 'attention' as const;
}

@Injectable()
export class AgentConsoleErrorMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'error' as const;
    readonly label = 'Error · ';
    readonly component = AgentConsoleErrorTemplate;
    override readonly tone = 'error' as const;
}

@Injectable()
export class AgentConsoleDiagnosticMessageRenderer extends AgentConsoleFamilyMessageRenderer {
    constructor(@Optional() @Inject(TranslatorService) private translator?: TranslatorService) { super(); }

    resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const builtin = resolveBuiltinMessageRenderer(templateKind);
        const metadata = message.metadata || {};
        const kind = presentAgentConsoleSessionContent(message).kind;
        const text = (kind: string, fallback: string) => formatAgentUiLabel(this.translator, `agent.timeline.${kind}`, fallback);
        const labels: Partial<Record<AgentConsoleContentKind, string>> = {
            error: text('error', 'Error · '), warning: text('warning', 'Warning · '), cancelled: text('cancelled', 'Cancelled · '),
            system: text('system', 'System · '), event: text('event', 'Event · ')
        };
        return { component: kind === 'error' || kind === 'warning' ? AgentConsoleErrorTemplate : AgentConsoleSystemTemplate, presentation: {
            ...builtin,
            roleLabel: metadata.backgroundSummary === true ? 'Background · ' : labels[kind] || 'Diagnostic · ',
            roleStyle: theme => styleTextToObject(
                kind === 'error' ? theme.statusErrorValue
                    : kind === 'warning' ? theme.statusBusyValue : theme.statusLabel
            ),
            itemStyle: (theme, selected) => ({
                ...builtin.itemStyle(theme, selected),
                margin: '0.35em 0'
            })
        } };
    }
}

@Injectable()
export class AgentConsoleAttachmentRenderer extends AgentConsoleFamilyMessageRenderer {}

const agentConsoleMessageRenderers: AgentConsoleResolvedMessageRenderer[] = [
    {
        templateKind: 'error',
        roleLabel: resolveMessageRoleLabel('error'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'error'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'error'),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'tool',
        roleLabel: resolveMessageRoleLabel('tool'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'tool'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'tool'),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'assistant',
        roleLabel: resolveMessageRoleLabel('assistant'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'assistant'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'assistant'),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'user',
        roleLabel: resolveMessageRoleLabel('user'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'user'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesUser, 'user'),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'planTodo',
        roleLabel: '',
        roleStyle: theme => styleTextToObject(theme.toolsAccent),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'fileChange',
        roleLabel: 'Δ ',
        roleStyle: theme => styleTextToObject(theme.toolsAccent),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
        lead: () => '',
        continuationLead: () => '  '
    },
    {
        templateKind: 'timelineBoundary',
        roleLabel: '├ ',
        roleStyle: theme => ({
            ...styleTextToObject(theme.toolsAccent),
            'font-weight': 'bold'
        }),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            'font-weight': 'bold',
            margin: '0'
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'timelineHeader',
        roleLabel: '┌ ',
        roleStyle: theme => styleTextToObject(theme.statusTitle),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            margin: '0'
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'timelineFooter',
        roleLabel: '└ ',
        roleStyle: theme => styleTextToObject(theme.statusTitle),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            margin: '0'
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'timelineCollapsed',
        roleLabel: '⋮ ',
        roleStyle: theme => styleTextToObject(theme.statusTitle),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            margin: '0'
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'system',
        roleLabel: resolveMessageRoleLabel('system'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'system'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
        lead: () => '',
        continuationLead: () => ''
    }
];


export function resolveBuiltinMessageRenderer(templateKind: AgentConsoleMessageTemplateKind): AgentConsoleResolvedMessageRenderer {
    return agentConsoleMessageRenderers.find(renderer => renderer.templateKind === templateKind)
        || agentConsoleMessageRenderers[agentConsoleMessageRenderers.length - 1];
}

function resolveMessageRowStyle(
    theme: AgentConsoleTheme,
    rowSelected: boolean,
    baseStyleText: string,
    templateKind: AgentConsoleMessageTemplateKind
): Record<string, string> {
    const rowStyleText = rowSelected
        ? theme.messagesSelected
        : templateKind === 'user'
            ? baseStyleText
            : '';
    return {
        padding: '0.6em 1ch',
        display: 'block',
        'box-sizing': 'border-box',
        'white-space': 'normal',
        'overflow-wrap': 'anywhere',
        margin: '0 0 0.25em 0',
        ...(rowStyleText ? styleTextToObject(rowStyleText) : {})
    };
}
