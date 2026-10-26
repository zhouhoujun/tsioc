import { NestedMessages } from '@tsdi/i18n';

/**
 * Tail of the agent-ui notice catalog.
 *
 * Split from the main catalog to keep every source file under the 600-line
 * budget; it is spread at the end of `AGENT_UI_NOTICE_EN` so key order (and
 * the en/zh lockstep test) stays unchanged.
 */
export const AGENT_UI_NOTICE_TAIL_EN: NestedMessages = {

  sessionSwitchBusy: 'Wait for the current turn to finish before switching sessions.',
  gitSnapshotRevertMessageConfirm: 'Revert working tree to snapshot of message {ref}?',
  gitSnapshotRestoreConfirm: 'Restore the working tree captured before the last git revert?',
  gitSnapshotRevertRefConfirm: 'Revert working tree to snapshot {ref}?',
  exportPreviewTitle: 'Session export ({format})',
  exportPreviewMessageOne: '{count} message',
  exportPreviewMessages: '{count} messages',
  exportPreviewToolCallOne: '{count} tool call',
  exportPreviewToolCalls: '{count} tool calls',
  exportPreviewHint: 'Read-only export preview. Press Esc to close.',
  noPendingAttachments: 'No pending attachments.',
  pendingAttachmentsTitle: 'Pending attachments: {names}',
  diffScopeUsage: 'Use only one of --staged, --unstaged, or --untracked.',
  diffUnknownOption: 'Unknown /diff option: {flag}',
  psStopSummary: 'Cancelled {cancelled}/{total} background task(s).',
  psStopReasonNotFound: 'not found',
  psStopReasonNotRunning: 'not running',
  psUndoHint: 'Undo: /ps undo',
  psRestoreSummary: 'Restored {restored}/{total} background task(s).',
  psRestoreReasonNotFound: 'not found',
  psRestoreReasonNotCancelled: 'not cancelled',
  psRestoreReasonFinished: 'run already finished',
  healthGatewayConnected: 'connected',
  healthGatewayUnreachable: 'unreachable',
  healthGatewayLocal: 'local runtime (no gateway)',
  healthMcpToolsActive: '{active}/{total} tools active',
  healthNoMcpServers: 'no MCP servers configured',
  healthLspTools: '{count} tools available',
  healthNoLspTools: 'no LSP tools available',

  copyLabelInput: 'input',
  copyLabelWorkspace: 'workspace',
  copyLabelSession: 'session',
  copyLabelAssistantMessage: 'assistant message',
  copyLabelTimelineEvent: 'timeline event',
  copyLabelSelectedMessage: 'selected message',
  copyLabelReview: 'review',
  copyLabelSelectedApproval: 'selected approval',
  copyLabelSelectedTask: 'selected task',
  copyLabelScheduledJob: 'scheduled job',
  copyLabelToolName: 'tool name',
  copyLabelToolRun: 'tool run',

  copyLabelModel: 'model',

  questionResponseFailed: 'Question response failed',
  inputHistoryLoadFailed: 'Failed to load input history: {error}',
  inputHistorySaveFailed: 'Failed to save input history: {error}',

};
