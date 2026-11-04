import type {
    AgentConsoleApprovalRequest,
    AgentConsoleCommandOutputEntry,
    AgentConsolePendingAttachment,
    AgentConsoleSelectOption,
    AgentConsoleSessionItem
} from './AgentConsoleSessionState';
import type { AgentConsoleParsedCommandArguments } from './AgentConsoleCommandRegistry';
import type { AgentConsoleSessionService } from './AgentConsoleSessionService';
import type { NavFilter, NavSelection, SessionSearchMatch } from '@tsdi/agent';
import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentUiDate, formatAgentUiDateTime, formatAgentUiNotice, formatAgentPanelLabel as panelLabel, type AgentUiTranslator } from './agent-ui.i18n';

export async function handleSearch(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!args || !args.trim()) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'searchUsage'));
        return true;
    }
    {
        const rawQuery = args.trim();
        let agentResults: SessionSearchMatch[] = [];
        try {
            agentResults = await (ctx.sessionService?.searchSessions(rawQuery) ?? Promise.resolve([]));
        } catch {
            agentResults = [];
        }
        if (agentResults.length) {
            const currentId = ctx.state.sessionId;
            const sessionId = await ctx.select(
                panelLabel(ctx.translator, 'sessions', 'searchTitle', 'Search: "{query}" ({count})', { query: rawQuery, count: agentResults.length }),
                agentResults.map(result => ({
                    label: `${result.sessionId}${result.sessionId === currentId ? ` [${panelLabel(ctx.translator, 'sessions', 'current', 'current')}]` : ''} (${panelLabel(ctx.translator, 'sessions', 'hitCount', '{count} msg', { count: result.count })})`,
                    value: result.sessionId,
                    detail: result.snippet || result.summary || result.workspace || ''
                })),
                0,
                ctx.state.consoleOptions.selectHint
            );
            if (sessionId) {
                await ctx.openSession(sessionId);
            }
            return true;
        }
        const query = rawQuery.toLowerCase();
        let sessions = ctx.state.sessions.slice();
        if (!sessions.length && ctx.sessionService) {
            const loaded = await ctx.sessionService.listSessions(ctx.state.sessionId);
            sessions = loaded.map(item => ({
                id: item.id,
                current: !!item.current,
                workspace: item.workspace,
                updatedAt: item.lastActiveAt,
                messageCount: item.messageCount,
                summary: item.summary,
                title: item.title,
                pinned: !!item.pinned,
                projectKey: item.projectKey,
                projectId: item.projectId,
                primaryThreadId: item.primaryThreadId,
                sessionRole: item.sessionRole,
                rootRequest: item.rootRequest,
                focusSummary: item.focusSummary,
                projectLabel: item.projectId || item.focusSummary || item.workspace || item.primaryThreadId || item.rootRequest || item.id
            }));
        }
        if (!sessions.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionsSearch'));
            return true;
        }
        const metadataMatches = sessions.filter(s => {
            const id = (s.id || '').toLowerCase();
            const summary = (s.summary || '').toLowerCase();
            const ws = (s.workspace || '').toLowerCase();
            const proj = (s.projectLabel || s.projectKey || s.projectId || '').toLowerCase();
            return id.includes(query) || summary.includes(query) || ws.includes(query) || proj.includes(query);
        });
        ctx.notify(formatAgentUiNotice(ctx.translator, 'searchingSessionsForQuery', { sessionCount: sessions.length, plural: sessions.length === 1 ? '' : 's', rawQuery: rawQuery }));
        const contentHits = await ctx.searchSessionContent(query, sessions);
        const seen = new Set<string>();
        const merged: AgentConsoleSessionItem[] = [];
        for (const s of metadataMatches) {
            if (!seen.has(s.id)) {
                seen.add(s.id);
                merged.push(s);
            }
        }
        for (const s of sessions) {
            if (!seen.has(s.id) && contentHits.has(s.id)) {
                seen.add(s.id);
                merged.push(s);
            }
        }
        if (!merged.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'noSessionsMatching', { rawQuery: rawQuery }));
            return true;
        }
        const sessionId = await ctx.select(
            panelLabel(ctx.translator, 'sessions', 'searchTitle', 'Search: "{query}" ({count})', { query: rawQuery, count: merged.length }),
            merged.map(s => {
                const hit = contentHits.get(s.id);
                const name = String(s.title || '').trim() || s.id;
                const pinned = s.pinned ? ' 📌' : '';
                return {
                    label: `${name}${s.current ? ` [${panelLabel(ctx.translator, 'sessions', 'current', 'current')}]` : ''}${hit ? ` (${panelLabel(ctx.translator, 'sessions', 'hitCount', '{count} msg', { count: hit.count })})` : ''} (${s.messageCount ?? '?'})${pinned}`,
                    value: s.id,
                    detail: hit ? hit.snippet : (s.summary || s.workspace || '')
                };
            }),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (sessionId) {
            await ctx.openSession(sessionId);
        }
    }
    return true;
}

// ── /projects ────────────────────────────────────────────────────────────────

export async function handleProjects(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!ctx.state.projects.length) {
        await ctx.refreshSessions();
    }
    if (!ctx.state.projects.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'projectsAvailable'));
        return true;
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    {
        const project = await ctx.select(
            panelLabel(ctx.translator, 'sessions', 'projectsTitle', 'Projects'),
            ctx.state.projects.map(p => ({
                label: `${p.label} (${p.sessionCount})`,
                value: p.key,
                detail: p.lastActive ? panelLabel(ctx.translator, 'sessions', 'lastActive', 'last active {date}', { date: formatAgentUiDate(p.lastActive, ctx.translator) }) : undefined
            })),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (!project) return true;
        const projectSessions = ctx.state.sessions.filter(
            s => ctx.resolveSessionProjectKey(s) === project
        );
        if (!projectSessions.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionsProject'));
            return true;
        }
        const sessionId = await ctx.select(
            panelLabel(ctx.translator, 'sessions', 'sessionsIn', 'Sessions in {name}', { name: project }),
            projectSessions.map(s => ({
                label: `${String(s.title || '').trim() || s.id}${s.current ? ` [${panelLabel(ctx.translator, 'sessions', 'current', 'current')}]` : ''} (${s.messageCount ?? '?'})${s.pinned ? ' 📌' : ''}`,
                value: s.id,
                detail: s.summary
            })),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (!sessionId) return true;
        // P236: share selection/filter store with /sessions for restore on switch.
        const canonicalProjectId = String(projectSessions.find(s => String(s.projectId || '').trim())?.projectId || '').trim();
        const projectIndex = Math.max(0, projectSessions.findIndex(s => s.id === sessionId));
        ctx.state.setNavFilter({ projectId: canonicalProjectId || project });
        ctx.state.setNavViewScroll('sessions', projectIndex);
        ctx.state.setNavSelection({ type: 'session', id: sessionId, index: projectIndex });
        await ctx.openSession(sessionId);
    }
    return true;
}

// ── /threads ─────────────────────────────────────────────────────────────────

export async function handleThreads(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!ctx.state.threads.length) {
        await ctx.refreshSessions();
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    {
        if (!ctx.state.threads.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'threadsAvailable'));
            return true;
        }
        const thread = await ctx.select(
            panelLabel(ctx.translator, 'sessions', 'threadsTitle', 'Threads'),
            ctx.state.threads.map(t => ({
                label: `${t.label} (${t.sessionCount})${t.sections?.length ? ` [${panelLabel(ctx.translator, 'sessions', 'sectionsSuffix', '{count} sections', { count: t.sections.length })}]` : ''}`,
                value: t.key,
                detail: t.lastActive ? panelLabel(ctx.translator, 'sessions', 'lastActive', 'last active {date}', { date: formatAgentUiDate(t.lastActive, ctx.translator) }) : undefined
            })),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (!thread) return true;
        const threadSessions = ctx.state.sessions.filter(
            s => ctx.resolveSessionThreadKey(s) === thread
        );
        if (!threadSessions.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionsThread'));
            return true;
        }
        const sessionId = await ctx.select(
            panelLabel(ctx.translator, 'sessions', 'sessionsIn', 'Sessions in {name}', { name: thread }),
            threadSessions.map(s => ({
                label: `${String(s.title || '').trim() || s.id}${s.current ? ` [${panelLabel(ctx.translator, 'sessions', 'current', 'current')}]` : ''} (${s.messageCount ?? '?'})${s.pinned ? ' 📌' : ''}`,
                value: s.id,
                detail: s.summary
            })),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (!sessionId) return true;
        await ctx.openSession(sessionId);
    }
    return true;
}

// ── /sections ────────────────────────────────────────────────────────────────

export async function handleSections(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const sectionSessionId = ctx.state.sessionId;
    if (!ctx.sessionService || !sectionSessionId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionServiceOr'));
        return true;
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    const labelArg = String(args || '').trim();
    if (labelArg) {
        await ctx.sessionService.createSection(sectionSessionId, labelArg);
        await ctx.refreshCurrentSections();
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sectionLabelCreated', { label: labelArg }));
        return true;
    }
    await ctx.refreshCurrentSections();
    if (!ctx.state.sections.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sectionsCreateOne'));
        return true;
    }
    const section = await ctx.select(
        panelLabel(ctx.translator, 'sessions', 'sectionsTitle', 'Sections'),
        ctx.state.sections.map(item => {
            const count = ctx.state.messages.filter(message => message.sectionId === item.id).length;
            return {
                label: `${item.label}${count ? ` (${panelLabel(ctx.translator, 'sessions', 'messageCount', '{count} messages', { count })})` : ''}`,
                value: item.id,
                detail: panelLabel(ctx.translator, 'sections', 'created', 'created {date}', { date: formatAgentUiDateTime(item.createdAt, ctx.translator) })
            };
        }),
        0,
        ctx.state.consoleOptions.selectHint
    );
    if (!section) {
        return true;
    }
    const action = await ctx.select(
        panelLabel(ctx.translator, 'sections', 'actions', 'Section actions'),
        [
            { label: panelLabel(ctx.translator, 'sections', 'rename', 'Rename'), value: 'rename', description: panelLabel(ctx.translator, 'sections', 'renameDescription', 'rename this section (choose a new label below)') },
            { label: panelLabel(ctx.translator, 'sections', 'delete', 'Delete'), value: 'delete', description: panelLabel(ctx.translator, 'sections', 'deleteDescription', 'delete this section and detach its messages') },
            { label: panelLabel(ctx.translator, 'sections', 'moveStart', 'Move to start'), value: 'start', description: panelLabel(ctx.translator, 'sections', 'moveStartDescription', 'move this section to the top') },
            { label: panelLabel(ctx.translator, 'sections', 'moveEnd', 'Move to end'), value: 'end', description: panelLabel(ctx.translator, 'sections', 'moveEndDescription', 'move this section to the bottom') },
            { label: panelLabel(ctx.translator, 'sections', 'createBefore', 'Create before'), value: 'before', description: panelLabel(ctx.translator, 'sections', 'createBeforeDescription', 'create a new section before this one') },
            { label: panelLabel(ctx.translator, 'sections', 'createAfter', 'Create after'), value: 'after', description: panelLabel(ctx.translator, 'sections', 'createAfterDescription', 'create a new section after this one') }
        ],
        0,
        ctx.state.consoleOptions.selectHint
    );
    if (!action) {
        return true;
    }
    if (action === 'delete') {
        await ctx.sessionService.deleteSection(sectionSessionId, section);
        await ctx.refreshCurrentSections();
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sectionDeleted'));
    } else if (action === 'start' || action === 'end') {
        const index = ctx.state.sections.findIndex(item => item.id === section);
        if (action === 'start' && index <= 0) {
            ctx.notify(index < 0 ? formatAgentUiNotice(ctx.translator, 'sectionNotFound') : formatAgentUiNotice(ctx.translator, 'sectionAlreadyAtStart'));
            return true;
        }
        if (action === 'end' && (index < 0 || index === ctx.state.sections.length - 1)) {
            ctx.notify(index < 0 ? formatAgentUiNotice(ctx.translator, 'sectionNotFound') : formatAgentUiNotice(ctx.translator, 'sectionAlreadyAtEnd'));
            return true;
        }
        await ctx.sessionService.moveSection(
            sectionSessionId,
            section,
            undefined,
            { beforeId: action === 'start' ? ctx.state.sections[0].id : undefined }
        );
        await ctx.refreshCurrentSections();
        ctx.notify(action === 'start' ? formatAgentUiNotice(ctx.translator, 'sectionMovedToStart') : formatAgentUiNotice(ctx.translator, 'sectionMovedToEnd'));
    } else if (action === 'before' || action === 'after') {
        const targetIndex = ctx.state.sections.findIndex(item => item.id === section);
        const beforeId = action === 'before'
            ? section
            : ctx.state.sections[targetIndex + 1]?.id;
        const label = await ctx.select(panelLabel(ctx.translator, 'select', 'newSectionLabel', 'New section label'), [
            { label: 'Continue from previous section', value: '' },
            { label: 'Next step', value: 'Next step' },
            { label: 'Implementation', value: 'Implementation' },
            { label: 'Analysis', value: 'Analysis' }
        ], 0, ctx.state.consoleOptions.selectHint);
        if (label === undefined) {
            return true;
        }
        const created = await ctx.sessionService.createSection(sectionSessionId, label || 'Section', undefined, { beforeId });
        await ctx.refreshCurrentSections();
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sectionLabelCreated', { label: created.label }));
    } else if (action === 'rename') {
        const label = await ctx.select(panelLabel(ctx.translator, 'select', 'renameSectionTo', 'Rename section to'), [
            { label: 'Next step', value: 'Next step' },
            { label: 'Implementation', value: 'Implementation' },
            { label: 'Analysis', value: 'Analysis' },
            { label: 'Refactor', value: 'Refactor' },
            { label: 'Review', value: 'Review' }
        ], 0, ctx.state.consoleOptions.selectHint);
        if (!label) {
            return true;
        }
        await ctx.sessionService.renameSection(sectionSessionId, section, label);
        await ctx.refreshCurrentSections();
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sectionRenamed', { label: label }));
    }
    return true;
}

// ── /threadplan ──────────────────────────────────────────────────────────────

export async function handleThreadplan(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    await ctx.refreshThreadTodoPlan();
    await ctx.loadThreadCodingTasks();
    if (!ctx.state.planTodos.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'planTodosThread'));
    }
    ctx.state.setSessionsFocused(false);
    ctx.state.setToolsFocused(false);
    ctx.state.setApprovalsFocused(false);
    ctx.state.setJobsFocused(false);
    ctx.transcriptNavigationController.setFocused(false);
    ctx.state.setTasksFocused(true);
    return true;
}

// ── /approvals ───────────────────────────────────────────────────────────────

