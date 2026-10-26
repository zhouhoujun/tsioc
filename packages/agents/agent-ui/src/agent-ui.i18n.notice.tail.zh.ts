import { NestedMessages } from '@tsdi/i18n';

/**
 * Tail of the agent-ui notice catalog.
 *
 * Split from the main catalog to keep every source file under the 600-line
 * budget; it is spread at the end of `AGENT_UI_NOTICE_ZH` so key order (and
 * the en/zh lockstep test) stays unchanged.
 */
export const AGENT_UI_NOTICE_TAIL_ZH: NestedMessages = {

  sessionSwitchBusy: '请等待当前轮次结束后再切换会话。',
  gitSnapshotRevertMessageConfirm: '将工作区恢复到消息 {ref} 的快照？',
  gitSnapshotRestoreConfirm: '恢复最近一次 git 回退前捕获的工作区？',
  gitSnapshotRevertRefConfirm: '将工作区恢复到快照 {ref}？',
  exportPreviewTitle: '会话导出（{format}）',
  exportPreviewMessageOne: '{count} 条消息',
  exportPreviewMessages: '{count} 条消息',
  exportPreviewToolCallOne: '{count} 次工具调用',
  exportPreviewToolCalls: '{count} 次工具调用',
  exportPreviewHint: '只读导出预览。按 Esc 关闭。',
  noPendingAttachments: '没有待处理的附件。',
  pendingAttachmentsTitle: '待处理附件：{names}',
  diffScopeUsage: '--staged、--unstaged、--untracked 只能选其一。',
  diffUnknownOption: '未知的 /diff 选项：{flag}',
  psStopSummary: '已取消 {cancelled}/{total} 个后台任务。',
  psStopReasonNotFound: '未找到',
  psStopReasonNotRunning: '未在运行',
  psUndoHint: '撤销：/ps undo',
  psRestoreSummary: '已恢复 {restored}/{total} 个后台任务。',
  psRestoreReasonNotFound: '未找到',
  psRestoreReasonNotCancelled: '未被取消',
  psRestoreReasonFinished: '运行已结束',
  healthGatewayConnected: '已连接',
  healthGatewayUnreachable: '不可达',
  healthGatewayLocal: '本地运行时（无网关）',
  healthMcpToolsActive: '{active}/{total} 个工具已激活',
  healthNoMcpServers: '未配置 MCP 服务器',
  healthLspTools: '{count} 个工具可用',
  healthNoLspTools: '没有可用的 LSP 工具',

  copyLabelInput: '输入',
  copyLabelWorkspace: '工作区',
  copyLabelSession: '会话',
  copyLabelAssistantMessage: '助手消息',
  copyLabelTimelineEvent: '时间线事件',
  copyLabelSelectedMessage: '选中消息',
  copyLabelReview: '评审结果',
  copyLabelSelectedApproval: '选中审批',
  copyLabelSelectedTask: '选中任务',
  copyLabelScheduledJob: '定时任务',
  copyLabelToolName: '工具名',
  copyLabelToolRun: '工具运行记录',

  copyLabelModel: '模型',

  questionResponseFailed: '问题回答失败',
  inputHistoryLoadFailed: '加载输入历史失败：{error}',
  inputHistorySaveFailed: '保存输入历史失败：{error}',

};
