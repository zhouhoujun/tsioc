import { AgentMessage, getAgentMessageImageParts, summarizeToolDisplayText } from '@tsdi/agent';
import { Inject, Injectable, Injector, Optional, Token, Type, token } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { defaultTimelineLabel, formatAgentUiLabel, type AgentUiTranslator } from './agent-ui.i18n';
import { noReact } from '@tsdi/components';
import {
    AgentConsoleMarkdownCodeData,
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownTableData,
    AgentConsoleMarkdownToken,
    AgentConsoleMarkdownTone,
    flattenAgentConsoleMarkdownLine,
    renderAgentConsoleMarkdownLines
} from './AgentConsoleMarkdown';
import { AGENT_CONSOLE_MARKDOWN_COMPONENT } from './AgentConsoleMessageComponents';
import { AgentConsoleTheme, defaultAgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';
import { getDisplayWidth, sliceByDisplayWidth } from './AgentConsoleTextWidth';
import {
    isAgentConsoleBlankMarkdownLine,
    resolveAgentConsoleLineItemStyle,
    resolveAgentConsoleMarkdownPrefixStyle,
    resolveAgentConsoleMarkdownToneStyle
} from './AgentConsoleMarkdownStyles';
import { renderAgentConsolePlainTextLines } from './markdown/spacing';
import { resolveSemanticLineMargin, resolveSemanticLinePadding, stripMentionContextBlock } from './AgentConsoleMessageLineStyles';
export { resolveAgentConsoleMarkdownPrefixStyle, resolveAgentConsoleMarkdownToneStyle } from './AgentConsoleMarkdownStyles';
import { resolveTimelineEventSentence, formatTimelineSessionDuration, AgentConsoleTimelineLabels } from './AgentConsoleTimelineWindow';
import { resolveTurnLifecycleLabel } from './AgentConsoleTimelineLabels';
import { resolvePlanTodoContent } from './AgentConsolePlanState';
import { resolveTimelineMeta, resolveTimelineMetaStyle, resolveMessageDurationMs, resolveMessageRoleLabel, resolveMessageRoleStyle, resolveAgentConsoleMessageRoleLabel, resolveEffectiveRoleLabel, shouldRenderWorkedSummary, localizeCommandExecutionStatus, localizeTimelineContentSuffix } from './AgentConsoleTimelineMeta';
import type { MarkdownWorkerBridge } from './MarkdownWorkerBridge';
import {
    AgentConsoleContentFamily,
    AgentConsoleContentKind,
    AgentConsoleSessionContentPresentation,
    presentAgentConsoleSessionContent
} from './AgentConsoleSessionContentPresenter';
import {
    AgentConsoleApprovalTemplate, AgentConsoleCommandTemplate, AgentConsoleErrorTemplate,
    AgentConsoleFilesTemplate, AgentConsolePlanTemplate, AgentConsoleQuestionTemplate,
    AgentConsoleSystemTemplate, AgentConsoleThoughtTemplate,
    AgentConsoleToolTemplate, AgentConsoleUserTemplate
} from './AgentConsoleMessageTemplates';
import {
    deriveTimelineDurations,
    formatAgentConsoleMessageStatus,
    resolveAgentConsoleMessageStatus,
    resolveAgentConsoleMessageStatusLabel,
    resolveAgentConsoleMessageStatusStyle,
    resolveDefaultStatusGlyph,
    resolveInlineRowStyle,
    resolveMessageTemplateKind,
    resolveRenderedLineToneStyle,
    resolveTimelineEventActionLabel,
    resolveTimelineEventItemStyle,
    truncateTimelineEventRowContent,
    TIMELINE_EVENT_ROW_CONTENT_MAX
} from './AgentConsoleMessageStatus';
export {
    deriveTimelineDurations,
    resolveAgentConsoleMessageStatus,
    resolveAgentConsoleMessageStatusLabel,
    resolveMessageTemplateKind,
    resolveTimelineEventActionLabel,
    truncateTimelineEventRowContent,
    TIMELINE_EVENT_ROW_CONTENT_MAX
} from './AgentConsoleMessageStatus';

import type {
    AgentConsoleInlineRowStyle,
    AgentConsoleMessageRenderContext,
    AgentConsoleMessageStatus,
    AgentConsoleMessageTemplateKind,
    AgentConsoleRenderedLine,
    AgentConsoleRenderedMessageItem,
    AgentConsoleResolvedMessageRenderer
} from './AgentConsoleMessageRenderers';
import { resolveBuiltinMessageRenderer } from './AgentConsoleMessageRendererRegistry';

export function renderAgentConsoleMessageItems(
    messages: AgentMessage[],
    context: AgentConsoleMessageRenderContext = {}
): AgentConsoleRenderedMessageItem[] {
    const source = deriveTimelineDurations(messages || []);
    return source.map((message, index) => {
        const item = renderAgentConsoleMessageItem(message, context);
        const previous = index > 0 ? presentAgentConsoleSessionContent(source[index - 1]) : undefined;
        if (previous?.kind === 'user' && item.semanticKind !== 'user') {
            item.spacerBefore = true;
            item.blockPadding = true;
        }
        return item;
    });
}

export function renderAgentConsoleMessageItem(
    message: AgentMessage,
    context: AgentConsoleMessageRenderContext = {}
): AgentConsoleRenderedMessageItem {
    const theme = context.theme || defaultAgentConsoleTheme;
    const presentation = presentAgentConsoleSessionContent(message);
    const templateKind = resolveMessageTemplateKind(message);
    const response = context.rendererRegistry?.resolve(message, templateKind) || {
        presentation: resolveBuiltinMessageRenderer(templateKind),
        component: AgentConsoleSystemTemplate
    };
    const renderer = response.presentation;
    const selected = message?.id === context.selectedMessageId;
    const rowSelected = !!(selected && context.messagesFocused);
    const baseItemStyle = renderer.itemStyle(theme, rowSelected);
    const baseRoleLabel = presentation.kind === 'assistant-final' && templateKind === 'assistant'
        ? ''
        : context.rendererRegistry
            ? renderer.roleLabel
            : resolveAgentConsoleMessageRoleLabel(message, renderer.roleLabel);
    const roleLabel = context.showUsername
        ? `${baseRoleLabel}${templateKind === 'user' ? String(context.username || 'you') : 'agent'}:`
        : baseRoleLabel;
    const timelineEvent = message?.metadata?.uiKind === 'event';
    const timelineEventType = String(message?.metadata?.uiEventType || '').trim();
    const reasoningRow = timelineEventType === 'reasoning';
    const criticalMark = context.showCriticalMarks ? '★ ' : '';
    const effectiveRoleLabel = resolveEffectiveRoleLabel(
        timelineEvent, presentation.kind, roleLabel, criticalMark, !!context.rendererRegistry);
    const statusKind = resolveAgentConsoleMessageStatus(message, templateKind);
    const actionLabel = timelineEvent ? resolveTimelineEventActionLabel(message, statusKind, context.translator) : '';
    const itemStyle = timelineEvent
        ? resolveTimelineEventItemStyle(theme, baseItemStyle, statusKind, rowSelected)
        : baseItemStyle;
    const inlineRowStyle = resolveInlineRowStyle(itemStyle);
    const statusLabel = resolveAgentConsoleMessageStatusLabel(statusKind, context.statusLabels);
    // Opencode renders assistant prose (final answer included) without a glyph; steps keep theirs.
    const statusSymbol = context.statusSymbol || ((timelineEvent || (context.timelineMode && templateKind !== 'assistant') || message?.metadata?.uiKind === 'command-execution') ? resolveDefaultStatusGlyph(statusKind) : '');
    // Opencode uses a compact +/− disclosure marker for reasoning rows; the
    // running state keeps the live dot.
    const thoughtSymbol = presentation.kind === 'thought' ? (statusKind === 'running' ? '●' : '+') : statusSymbol;
    const status = templateKind === 'planTodo' ? '' : formatAgentConsoleMessageStatus(statusKind, thoughtSymbol);
    // Settled thoughts are chrome: keep the disclosure marker muted so it does not compete with live steps.
    const statusStyle = presentation.kind === 'thought' && statusKind !== 'running'
        ? styleTextToObject(theme.statusLabel)
        : resolveAgentConsoleMessageStatusStyle(theme, statusKind, rowSelected);
    const hideToolOutput = templateKind === 'tool' && context.showToolOutput === false;
    const rawDisplayContent = hideToolOutput
        ? ''
        : resolveMessageDisplayContent(message, templateKind, !!context.rawMode);
    // Tool-result markers (`<path> (truncated)`) are written by the runtime before the locale is known.
    const rowDisplayContent = (timelineEvent || templateKind === 'tool') ? localizeTimelineContentSuffix(rawDisplayContent, context.translator) : rawDisplayContent;
    const displayContent = message?.metadata?.uiKind === 'command-execution' ? localizeCommandExecutionStatus(rowDisplayContent, context.translator) : rowDisplayContent;
    const timelineSentence = timelineEvent
        ? resolveTimelineEventSentence(message?.metadata, displayContent, context.timelineLabels)
        : undefined;
    // Content stays the primary row text (P237 truncation/expansion contract;
    // long rows also keep the detail toggle); the sentence only fills empty
    // content events like model_completed.
    // The event bridge/gateway writes boilerplate English turn lifecycle rows;
    // localize them at render time so a resumed session follows the current
    // locale. Custom reasons (`Stopped by user`) stay verbatim.
    const lifecycleLabel = timelineEvent ? resolveTurnLifecycleLabel(displayContent, context.timelineLabels) : '';
    const eventText = lifecycleLabel || displayContent || timelineSentence || '';
    // Reasoning stays a compact execution row but keeps its full source so the
    // Thought disclosure can reveal every line on demand.
    const eventRowContent = timelineEvent
        ? (reasoningRow || (context.messageDetailOpen && selected)
            ? eventText
            : truncateTimelineEventRowContent(eventText, statusKind, timelineEventType))
        : displayContent;
    const messageStreaming = templateKind === 'assistant' && !!(message?.metadata?.streaming);
    const streaming = messageStreaming || !!context.streaming;
    // opencode insets assistant prose five columns (session inset plus
    // paddingLeft={3}); item padding already contributes one, so add four.
    const bodyIndent = !timelineEvent
        && templateKind === 'assistant'
        && (presentation.kind === 'assistant-final' || presentation.kind === 'assistant-partial')
        ? '    '
        : '';
    const markdownWidth = context.markdownContentWidth
        ? Math.max(24, context.markdownContentWidth - bodyIndent.length)
        : context.markdownContentWidth;
    const markdownLines = hideToolOutput
        ? []
        : context.rawMode || templateKind === 'planTodo'
            || templateKind === 'timelineHeader' || templateKind === 'timelineFooter'
            || templateKind === 'timelineCollapsed'
            ? renderAgentConsolePlainTextLines(eventRowContent, { compactBlankLines: false })
            : streaming || templateKind === 'user'
                ? streaming
                    ? resolveMarkdownLines(eventRowContent, { compactBlankLines: true, treatUnclosedFenceAsText: true, tableWidth: markdownWidth }, context.markdownBridge)
                    : renderAgentConsolePlainTextLines(eventRowContent, { compactBlankLines: true })
                : resolveMarkdownLines(eventRowContent, { compactBlankLines: !timelineEvent, tableWidth: markdownWidth }, context.markdownBridge);
    const timelineMeta = resolveTimelineMeta(message, templateKind, statusLabel, !!context.showTimestamps, context.translator);
    const metaDurationSuffix = timelineMeta.match(/ \([^()]+\)$/)?.[0] || '';
    // Step boundaries own their duration in meta; event rows keep it as a
    // trailing muted token at the end of the row (P302 vs P237/row-end).
    const durationStaysInMeta = templateKind === 'timelineBoundary';
    const timelineDetails = !durationStaysInMeta && metaDurationSuffix
        ? timelineMeta.slice(0, -metaDurationSuffix.length)
        : timelineMeta;
    // Final replies render the worked/done summary as a dedicated footer line
    // instead of gluing it onto the last body line; that footer already carries
    // the duration, so no trailing token is appended for them.
    const workedSummary = templateKind === 'assistant' && shouldRenderWorkedSummary(message);
    const metaText = timelineDetails ? `${timelineDetails} ` : '';
    const tokenDurationSuffix = durationStaysInMeta ? '' : metaDurationSuffix;
    const fallbackLine = templateKind === 'assistant'
            ? { rawText: '', tokens: [{ text: '…' }] as AgentConsoleMarkdownToken[] }
            : { rawText: '', tokens: [] as AgentConsoleMarkdownToken[] };
    const sourceLines = markdownLines.length ? markdownLines : [fallbackLine as AgentConsoleMarkdownLine];
    // Inline disclosure is signaled by hover/click affordance, not copy.
    const timelineMetaStyle = resolveTimelineMetaStyle(theme, rowSelected, templateKind);
    const lines: AgentConsoleRenderedLine[] = sourceLines.map((line, index) => {
        const isFirst = index === 0;
        const isLast = index === sourceLines.length - 1;
        const blankLine = isAgentConsoleBlankMarkdownLine(line);
        const rendered = buildRenderedLine(
            { ...line, tokens: line.tokens || [] },
            isFirst ? renderer.lead(rowSelected) : renderer.continuationLead(rowSelected),
            effectiveRoleLabel,
            renderer,
            theme,
            rowSelected,
            templateKind,
            inlineRowStyle,
            isFirst ? status : formatAgentConsoleMessageStatus(undefined, context.statusSymbol),
            statusKind,
            statusLabel,
            isFirst ? statusStyle : rowSelected ? {} : inlineRowStyle
        );
        const tokens = isLast && (actionLabel || tokenDurationSuffix)
            ? [
                ...rendered.tokens,
                ...(actionLabel ? [{ text: ` · ${actionLabel}`, tone: 'muted' as const, style: timelineMetaStyle }] : []),
                ...(tokenDurationSuffix ? [{ text: tokenDurationSuffix, tone: 'muted' as const, style: timelineMetaStyle }] : [])
            ]
            : rendered.tokens;
        const continuationIndent = rendered.continuationIndent ? rendered.continuationIndent + bodyIndent.length : 0;
        return {
            ...rendered,
            tokens,
            prefix: bodyIndent ? `${bodyIndent}${rendered.prefix || ''}` : rendered.prefix,
            continuationIndent: continuationIndent || undefined,
            messageId: message?.id,
            toggleContent: '',
            role: blankLine ? '' : isFirst ? rendered.role : rendered.role ? '    ' : '',
            roleStyle: blankLine || !isFirst ? {} : rendered.roleStyle,
            meta: blankLine || templateKind === 'planTodo' ? '' : workedSummary ? '' : (isFirst ? metaText : ''),
            metaStyle: blankLine || templateKind === 'planTodo' ? {} : workedSummary ? {} : (isFirst || isLast ? timelineMetaStyle : {}),
            ariaLabel: blankLine ? '' : [
                isFirst ? presentation.title : '',
                isFirst && String(timelineMeta || '').split(' · ').includes(String(rendered.statusLabel || '')) ? '' : isFirst ? rendered.statusLabel : '',
                isLast && !workedSummary ? timelineMeta : '',
                isLast ? actionLabel : '',
                rendered.prefix,
                rendered.content
            ].filter(part => String(part || '').trim()).join(' ').replace(/\s+/g, ' ').trim(),
            itemStyle: resolveAgentConsoleLineItemStyle(
                itemStyle,
                resolveSemanticLinePadding(presentation, isFirst, isLast, timelineEvent),
                resolveSemanticLineMargin(presentation, isFirst, timelineEvent, String(itemStyle.margin || '0')),
                blankLine,
                continuationIndent
            ),
            lineStyle: {
                ...(rendered.lineStyle || {}),
                ...resolveRenderedLineToneStyle(theme, rendered, rowSelected, templateKind, timelineEvent)
            },
            semanticFamily: presentation.family,
            semanticKind: presentation.kind
        };
    });
    if (workedSummary) {
        const base = lines[lines.length - 1];
        lines.push({
            ...base,
            status: '',
            statusStyle: {},
            role: '',
            roleStyle: {},
            prefix: '',
            tokens: [],
            toggleContent: '',
            meta: metaText,
            metaStyle: timelineMetaStyle,
            ariaLabel: timelineMeta,
            itemStyle: { ...base.itemStyle },
            lineStyle: { ...(base.lineStyle || {}) }
        });
    }
    const mentionFiles = templateKind === 'user' && Array.isArray(message?.metadata?.mentionFiles)
        ? (message!.metadata!.mentionFiles as unknown[]).map(value => String(value)).filter(Boolean)
        : [];
    if (mentionFiles.length) {
        const base = lines[lines.length - 1];
        lines.push({
            ...base,
            status: '',
            statusStyle: {},
            role: '',
            roleStyle: {},
            prefix: '',
            toggleContent: '',
            tokens: [{ text: `Files · ${mentionFiles.join(', ')}`, tone: 'muted' as const, style: timelineMetaStyle }],
            meta: '',
            metaStyle: {},
            ariaLabel: `Files ${mentionFiles.join(', ')}`,
            itemStyle: { ...base.itemStyle },
            lineStyle: { ...(base.lineStyle || {}) }
        });
    }
    return {
        [noReact]: true,
        kind: roleLabel,
        templateKind,
        selected,
        statusKind,
        statusLabel,
        status,
        statusStyle,
        itemStyle,
        component: response.component,
        lines,
        semanticFamily: presentation.family,
        semanticKind: presentation.kind,
        spacerBefore: !timelineEvent && presentation.kind === 'assistant-final',
        blockPadding: !timelineEvent
            && (presentation.kind === 'user' || presentation.kind === 'assistant-final')
    };
}
import {
    buildRenderedLine,
    resolveMarkdownLines,
    resolveMessageDisplayContent
} from './AgentConsoleMessageContentRenderer';
