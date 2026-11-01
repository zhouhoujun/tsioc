/** Timeline copy templates. Kept separate so the window/layout module stays focused. */
export interface AgentConsoleTimelineLabels {
    /** Compact-mode summary template; `{hidden}` is the hidden count. */
    summaryCompact?: string;
    /** Steps-mode summary template; `{hidden}` is the hidden count. */
    summarySteps?: string;
    /** Plan-step boundary template; `{index}`, `{total}`, `{content}` placeholders. */
    boundaryStep?: string;
    /** Session-header start-time template (P291); `{time}` is a locale short time. */
    headerStart?: string;
    /** Session-header current-step template (P291); `{index}`, `{total}` placeholders. */
    headerStep?: string;
    /** Session-footer error-count template (P303); `{count}` placeholder, shown only when > 0. */
    footerErrors?: string;
    /** Session-footer terminal state word when the session completed (P291). */
    footerDone?: string;
    /** Session-footer terminal state word when the session errored (P291). */
    footerFailed?: string;
    /** Session-footer terminal state word while the session is running (P291). */
    footerRunning?: string;
    /** Session-footer duration template (P291); `{duration}` placeholder. */
    footerDuration?: string;
    /** Collapsed-turn round prefix (P290/P303); `{index}` placeholder. */
    collapsedTurn?: string;
    /** Collapsed-turn outcome word when the turn completed (P303). */
    collapsedOutcomeDone?: string;
    /** Collapsed-turn outcome word when the turn was cancelled (P303). */
    collapsedOutcomeCancelled?: string;
    /** Collapsed-turn outcome word when the turn errored (P303). */
    collapsedOutcomeFailed?: string;
    /** Collapsed-turn tool-count template (P303); `{tools}` placeholder. */
    collapsedTools?: string;
    /** Collapsed-turn change-count template (P303); `{changes}` placeholder, shown only when > 0. */
    collapsedChanges?: string;
    /** Collapsed-turn error-count template (P303); `{errors}` placeholder, shown only when > 0. */
    collapsedErrors?: string;
    /** Todos block title (opencode-style `# Todos`). */
    todosTitle?: string;
    /** Plan progress word in the plan header (e.g. `plan`). */
    planLabel?: string;
    /** Plan active-count word in the plan header. */
    planActive?: string;
    /** Plan blocked-count word in the plan header. */
    planBlocked?: string;
    /** Plan failed-count word in the plan header. */
    planFailed?: string;
    /** Plan completion summary; `{completed}`, `{total}`, `{failures}` placeholders. */
    planCompleted?: string;
    /** Appended only when steps failed. */
    planFailures?: string;
    /** Appended only when steps were cancelled (never counted as failures). */
    planCancelled?: string;
    // ── P301: sentence action-verb i18n ──────────────────────────────────────
    /** Action verb for approval_request / approval events (P301). */
    actionApprovalRequested?: string;
    /** Action verb for tool_failed events (P301). */
    actionFailedToRun?: string;
    /** Action verb for tool_succeeded / tool_completed events (P301). */
    actionFinished?: string;
    /** Action verb for tool_invoked / tool_call / tool_running events (P301). */
    actionRunning?: string;
    /** Action verb for turn_started events (P301). */
    actionGotRequest?: string;
    /** Action verb for turn_cancelled events (P301). */
    actionTurnCancelled?: string;
    actionTurnCompleted?: string;
    /** Action verb for plan_created events (P301). */
    actionCreatedPlan?: string;
    /** Action verb for plan_step_started / step_started events (P301). */
    actionExecutingStep?: string;
    /** Action verb for plan_step_completed / step_completed events (P301). */
    actionCompletedStep?: string;
    /** Action verb for plan_step_failed / step_failed events (P301). */
    actionStepFailed?: string;
    /** Action verb for plan_step_blocked / step_blocked events (P301). */
    actionStepBlocked?: string;
    /** Action verb for context_prepared events (P301). */
    actionLoadedContext?: string;
    /** Action verb for model_completed events (P301). */
    actionModelResponded?: string;
    /** Action verb for background_task_started events (P301). */
    actionBackgroundTaskStarted?: string;
    /** Action verb for background_task_completed events (P301). */
    actionBackgroundTaskCompleted?: string;
    /** Action verb for background_task_failed events (P301). */
    actionBackgroundTaskFailed?: string;
    /** Fallback action verb for unknown event types (P301). */
    actionCompleted?: string;
}

/** zh 默认（对齐 messageStatusLabels 模式，P288）。 */
export const DEFAULT_TIMELINE_LABELS: Required<AgentConsoleTimelineLabels> = {
    summaryCompact: '已隐藏 {hidden} 条事件 · 紧凑模式仅显示当前步骤与错误',
    summarySteps: '已隐藏 {hidden} 条早期事件',
    boundaryStep: '第 {index}/{total} 步 · {content}',
    headerStart: '开始 {time}',
    headerStep: 'step {index}/{total}',
    footerErrors: '{count} 个错误',
    footerDone: '完成',
    footerFailed: '失败',
    footerRunning: '进行中',
    footerDuration: '耗时 {duration}',
    collapsedTurn: '第 {index} 轮',
    collapsedOutcomeDone: '完成',
    collapsedOutcomeCancelled: '已取消',
    collapsedOutcomeFailed: '失败',
    collapsedTools: '{tools} 个工具',
    collapsedChanges: '{changes} 处变更',
    collapsedErrors: '{errors} 个错误',
    todosTitle: '# 待办',
    planLabel: '计划',
    planActive: '进行中',
    planBlocked: '阻塞',
    planFailed: '失败',
    planCompleted: '计划已完成：{completed}/{total} 步',
    planFailures: '，{failures} 个失败',
    planCancelled: '，{cancelled} 个已取消',
    actionApprovalRequested: '请求审批',
    actionFailedToRun: '运行失败',
    actionFinished: '已完成',
    actionRunning: '运行中',
    actionGotRequest: '已收到请求',
    actionTurnCancelled: '轮次已取消',
    actionTurnCompleted: '轮次已完成',
    actionCreatedPlan: '已创建计划',
    actionExecutingStep: '执行步骤',
    actionCompletedStep: '步骤已完成',
    actionStepFailed: '步骤失败',
    actionStepBlocked: '步骤阻塞',
    actionLoadedContext: '已加载上下文',
    actionModelResponded: '模型已响应',
    actionBackgroundTaskStarted: '后台任务已启动',
    actionBackgroundTaskCompleted: '后台任务已完成',
    actionBackgroundTaskFailed: '后台任务失败',
    actionCompleted: '已完成',
};

const TURN_LIFECYCLE_LABEL_KEYS: Record<string, keyof AgentConsoleTimelineLabels> = {
    'analyzing request': 'actionGotRequest',
    'turn started': 'actionGotRequest',
    'turn completed': 'actionTurnCompleted',
    'turn cancelled': 'actionTurnCancelled'
};

/** Localized label for boilerplate English turn lifecycle rows written by the bridge/gateway. */
export function resolveTurnLifecycleLabel(content: string, labels?: AgentConsoleTimelineLabels): string {
    const key = TURN_LIFECYCLE_LABEL_KEYS[String(content || '').trim().toLowerCase()];
    if (!key) {
        return '';
    }
    return labels?.[key] ?? EN_TIMELINE_LABELS[key];
}

export const EN_TIMELINE_LABELS: Required<AgentConsoleTimelineLabels> = {
    summaryCompact: '{hidden} events hidden · compact shows active step + errors only',
    summarySteps: '{hidden} earlier timeline events hidden',
    boundaryStep: 'Step {index} of {total} · {content}',
    headerStart: 'started {time}',
    headerStep: 'step {index}/{total}',
    footerErrors: '{count} error(s)',
    footerDone: 'Done',
    footerFailed: 'Failed',
    footerRunning: 'In progress',
    footerDuration: 'took {duration}',
    collapsedTurn: 'turn {index}',
    collapsedOutcomeDone: 'Done',
    collapsedOutcomeCancelled: 'Cancelled',
    collapsedOutcomeFailed: 'Failed',
    collapsedTools: '{tools} tool calls',
    collapsedChanges: '{changes} change(s)',
    collapsedErrors: '{errors} error(s)',
    todosTitle: '# Todos',
    planLabel: 'plan',
    planActive: 'active',
    planBlocked: 'blocked',
    planFailed: 'failed',
    planCompleted: 'Plan completed: {completed}/{total} steps',
    planFailures: ', {failures} failed',
    planCancelled: ', {cancelled} cancelled',
    actionApprovalRequested: 'Approval requested',
    actionFailedToRun: 'Failed to run',
    actionFinished: 'Finished',
    actionRunning: 'Running',
    actionGotRequest: 'Got your request',
    actionTurnCancelled: 'Turn cancelled',
    actionTurnCompleted: 'Turn completed',
    actionCreatedPlan: 'Created plan',
    actionExecutingStep: 'Executing step',
    actionCompletedStep: 'Completed step',
    actionStepFailed: 'Step failed',
    actionStepBlocked: 'Step blocked',
    actionLoadedContext: 'Loaded context',
    actionModelResponded: 'Model responded',
    actionBackgroundTaskStarted: 'Background task started',
    actionBackgroundTaskCompleted: 'Background task completed',
    actionBackgroundTaskFailed: 'Background task failed',
    actionCompleted: 'Completed',
};
