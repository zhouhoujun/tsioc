import { ModelFailure } from '@tsdi/agent';
import { formatAgentUiNotice } from './agent-ui.i18n';
import { ModelHandlerContext } from './AgentConsoleModelHandlers';
import { AgentConsoleSelectOption } from './AgentConsoleSessionState';

const UNAVAILABLE_SIGNAL = /model[_ -]?not[_ -]?found|model[_ -]?not[_ -]?available|unknown model|unsupported model|does not exist|decommission|retired|no longer available/i;

/** Prefer a provider/model value that `model.activate` accepts. */
function catalogValue(provider: string, id: string): string {
    return id.includes('/') ? id : `${provider}/${id}`;
}

/**
 * Classify a failed model request as "this model is not available" rather
 * than a transient provider problem. The live catalogue is authoritative:
 * a 503 for a model the provider no longer lists means retrying cannot help.
 */
export function isModelUnavailableFailure(failure: ModelFailure, models: any[] = [], message = ''): boolean {
    if (failure.status === 404) {
        return true;
    }
    if (UNAVAILABLE_SIGNAL.test(`${failure.detail || ''} ${message}`)) {
        return true;
    }
    if (Array.isArray(models) && models.length) {
        const current = String(failure.model || '').trim();
        if (current && !models.some(model => String(model?.id || '') === current)) {
            return true;
        }
    }
    return false;
}

const activePrompts = new WeakSet<object>();

/**
 * On a model-unavailable failure, fetch the provider's live catalogue and
 * offer the working models directly. Choosing one activates and persists it;
 * the user can resend the failed message.
 */
export async function promptModelUnavailable(ctx: ModelHandlerContext, failure: ModelFailure): Promise<void> {
    if (!ctx.appRpc || activePrompts.has(ctx.state)) {
        return;
    }
    activePrompts.add(ctx.state);
    try {
        const model = ctx.options().model as any;
        const provider = String(model?.provider || failure.provider || '').trim();
        const current = String(model?.model || failure.model || '').trim();
        const catalog = await ctx.appRpc.request('model.catalog', { provider }).catch(() => undefined);
        const models: any[] = Array.isArray(catalog?.models) ? catalog.models : [];
        if (!isModelUnavailableFailure(failure, models, String(failure.detail || ''))) {
            return;
        }
        if (!models.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'modelUnavailableCatalogFailed'));
            return;
        }
        const catalogProvider = String(catalog?.provider || provider || '').trim();
        const options: AgentConsoleSelectOption[] = models.map((entry: any) => {
            const id = String(entry?.id || '').trim();
            return {
                label: `${entry?.name || id}${id === current ? ` ${formatAgentUiNotice(ctx.translator, 'modelCurrentMarker')}` : ''}`,
                value: catalogValue(catalogProvider, id),
                description: [catalogProvider, id].filter(Boolean).join(' / ')
            };
        }).filter((option: AgentConsoleSelectOption) => !!option.value);
        const selectedIndex = Math.max(0, models.findIndex((entry: any) => String(entry?.id || '') === current));
        const selected = await ctx.select(
            formatAgentUiNotice(ctx.translator, 'modelUnavailableTitle', { model: current || failure.model }),
            options,
            selectedIndex,
            formatAgentUiNotice(ctx.translator, 'modelUnavailableHint')
        );
        if (!selected) {
            return;
        }
        await ctx.activateModelProfile?.(selected);
        ctx.notify(formatAgentUiNotice(ctx.translator, 'switchedModelProfile', { name: selected }));
    } finally {
        activePrompts.delete(ctx.state);
    }
}
