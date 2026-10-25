/**
 * Transcript replay copy: the sentences written into seeded timeline rows when
 * a session is resumed. Kept in its own catalog so the notice/menu/panel
 * catalogs stay inside the source-size budget; values mirror the English
 * projections in `AgentConsoleSessionState`.
 *
 * Tool names, plan/step labels, ids and backend error text stay untranslated.
 */

export const AGENT_UI_TRANSCRIPT_EN: Record<string, any> = {
    replay: {
        toolRunning: 'Running {label}',
        toolFailed: '{label} failed: {error}',
        toolCompleted: '{label} completed{duration}',
        stepStarted: 'Step started: {label}',
        stepBlocked: 'Step blocked: {label}{reason}',
        stepFailed: 'Step failed: {label}',
        stepCancelled: 'Step cancelled: {label}',
        stepCompleted: 'Step completed: {label}',
        planCompleted: 'Plan completed: {label}',
        planCreated: 'Plan created: {label}',
        planStatus: 'Plan {status}: {label}',
        turnStarted: 'Turn started',
        turnCompleted: 'Turn completed',
        turnCancelled: 'Turn cancelled',
        unknownError: 'unknown error'
    }
};

export const AGENT_UI_TRANSCRIPT_ZH: Record<string, any> = {
    replay: {
        toolRunning: '正在运行 {label}',
        toolFailed: '{label} 失败：{error}',
        toolCompleted: '{label} 已完成{duration}',
        stepStarted: '步骤开始：{label}',
        stepBlocked: '步骤阻塞：{label}{reason}',
        stepFailed: '步骤失败：{label}',
        stepCancelled: '步骤已取消：{label}',
        stepCompleted: '步骤完成：{label}',
        planCompleted: '计划已完成：{label}',
        planCreated: '计划已创建：{label}',
        planStatus: '计划 {status}：{label}',
        turnStarted: '轮次已开始',
        turnCompleted: '轮次已完成',
        turnCancelled: '轮次已取消',
        unknownError: '未知错误'
    }
};
