import type { TranslationBundle } from '@tsdi/i18n';
import { AGENT_UI_NOTICE_EN } from './agent-ui.i18n.notice.en';
import { AGENT_UI_ERROR_EN } from './agent-ui.i18n.error';
import { AGENT_UI_TOOL_LABELS_EN } from './agent-ui.i18n.tools';
import { AGENT_UI_HINT_EN, AGENT_UI_MENU_EN } from './agent-ui.i18n.menu';
import { AGENT_UI_PANEL_EN } from './agent-ui.i18n.panel';
import { AGENT_UI_APPROVAL_EN } from './agent-ui.i18n.approval';
import { AGENT_UI_DIAG_EN } from './agent-ui.i18n.diagnostics';
import { AGENT_UI_TRANSCRIPT_EN } from './agent-ui.i18n.transcript';
import { AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS, AGENT_UI_SESSION_CLOSING_MESSAGES } from './agent-ui.i18n.constants';

export const agentUiEnglish: TranslationBundle = {
    locale: 'en',
    messages: {
        agent: {
            turn: {
                understanding: 'Understanding the request',
                preparing: 'Preparing the response',
                reasoning: 'Reasoning',
                working: 'Working',
                running: 'Running',
                toolsRunning: 'Running {count} operations',
                backgroundCommand: 'Running a background command',
                interruptHint: 'esc to interrupt',
                backgroundRunning: '{count} background terminal(s) running',
                backgroundView: '/ps to view',
                backgroundStop: '/ps stop to close'
            },
            status: {
                approvalRequired: 'Approval required: {tool} ({id}){extra}'
            },
            command: {
                group: { core: 'core', session: 'session', display: 'display', input: 'input', review: 'review', hooks: 'hooks', delegation: 'delegation', system: 'system' },
                workspace: 'context',
                unknown: 'Unknown command: {command}',
                ambiguous: 'Ambiguous command: {command}  ({matches})',
                label: 'Command',
                status: { running: 'running', completed: 'completed', cancelled: 'cancelled', failed: 'failed' }
            },
            hint: AGENT_UI_HINT_EN,
            menu: { ...AGENT_UI_MENU_EN, panel: AGENT_UI_PANEL_EN, diag: AGENT_UI_DIAG_EN, transcript: AGENT_UI_TRANSCRIPT_EN },
            context: {
                strategy: 'context {strategy}',
                level: 'level {level}',
                summary: 'summary',
                noSummary: 'no summary',
                messages: '{before}→{after} msgs',
                tokens: '{before}→{after} tok',
                saved: '{ratio}% saved',
                retained: '{rate}% retained',
                anchors: '{count} anchors',
                tools: '{count} tools',
                cumulative: 'cum {count} tok'
            },
            timeline: {
                thought: 'Thought · ',
                tool: 'Tool · ',
                command: '$ ',
                plan: 'Plan · ',
                todosTitle: '# Todos',
                'file-change': 'Files · ',
                question: 'Question · ',
                approval: 'Approval · ',
                error: 'Error · ',
                warning: 'Warning · ',
                cancelled: 'Cancelled · ',
                system: 'System · ',
                event: 'Event · ',
                rawOutput: 'Raw output',
                loadingOutput: 'Loading raw output…',
                truncated: '(truncated)',
                actionRetry: 'Retry',
                actionReview: 'Review',
                workedFor: 'Worked for {duration} · done {time}',
                planSummary: '{total} steps ({completed} done)',
                goalProgress: 'goal: {met}/{total} criteria met'
            },
            mention: { folder: 'folder', file: 'file', skill: 'skill', plugin: 'plugin' },
            approval: AGENT_UI_APPROVAL_EN,
            dashboard: {
                approvals: 'approvals {count}',
                jobs: 'jobs {running}/{total}',
                tasks: 'tasks {active}/{total}',
                tools: 'tools {count}',
                tokens: '{count} tokens'
            },
            notice: {
                ...AGENT_UI_NOTICE_EN
            },
            error: {
                ...AGENT_UI_ERROR_EN
            },
            modelError: {
                quota: 'Model request refused: the {provider} account has insufficient balance (model {model}, status {status}). Top up the account or switch model with /model, then retry.',
                auth: 'Model request refused: the API key for {provider} is missing or invalid (model {model}, status {status}). Update the key in settings, then retry.',
                config: 'The model provider "{provider}" is not configured for model {model}. Fix provider/model/baseUrl in settings, then retry.',
                rateLimit: '{provider} is rate limiting this model (status {status}). Retrying shortly; use /model to switch if it keeps happening.',
                capacity: '{provider} reports this model as overloaded (status {status}). Retrying shortly; use /model to switch if it keeps happening.',
                server: '{provider} returned a server error for {model} (status {status}). Usually temporary — retry, or switch model with /model.',
                network: 'Cannot reach {provider} for model {model}. Check the network and baseUrl, then retry.',
                timeout: 'The request to {provider} for model {model} timed out. Retry, or raise timeoutMs in settings.',
                unknown: 'The request to {provider} for model {model} failed (status {status}). Retry, or switch model with /model.'
            },
            message: {
                expand: '… {count} more lines. Click to expand',
                collapse: 'Click to collapse',
                expandAction: 'Click to expand',
                expandEnter: '… {count} more lines. Press Enter to expand',
                collapseEnter: 'Press Enter to collapse',
                copyCode: 'Copy',
                copiedCode: 'Copied',
                followUpOnlyTerms: AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS
            },
            session: {
                closing: AGENT_UI_SESSION_CLOSING_MESSAGES.en
            },
            tool: {
                ...AGENT_UI_TOOL_LABELS_EN,
                list_dir: 'Inspect directory', glob_search: 'Search files', content_search: 'Search code',
                read_file: 'Read file', write_file: 'Create file', edit_file: 'Edit file', apply_patch: 'Apply changes',
                mkdir: 'Create directory', todo: 'Update plan', ask_user: 'Waiting for your input',
                coding_task: 'Run implementation task', git_operations: 'Check version control',
                stat: 'Inspect file', watch_files: 'Watch files', move_file: 'Move file', copy_file: 'Copy file',
                delete_file: 'Delete file', web_search: 'Web search', web_extract: 'Fetch web page',
                weather: 'Check weather', location: 'Resolve location', terminal: 'Run command',
                background_task: 'Run background task', schedule: 'Schedule prompt',
                spawn_agent: 'Spawn sub-agent', parallel_spawn: 'Run parallel tasks', orchestrate: 'Orchestrate tasks',
                fan_out: 'Fan out tasks', map_reduce: 'Map-reduce tasks', race: 'Race tasks',
                wait_all: 'Wait for all tasks', wait_any: 'Wait for any task', escalate: 'Escalate to the user',
                tool_search: 'Search tools', tool_inspect: 'Inspect tool', review_diff: 'Review diff',
                'process.start': 'Start process', 'process.poll': 'Poll process', 'process.kill': 'Stop process',
                invoked: 'Running {label}', completed: '{label} completed', failed: '{label} failed', failedWithError: '{label} failed: {error}', skipped: '{label} skipped', skippedWithReason: '{label} skipped: {reason}', gitMissing: 'Git repository not detected. If you want version control, ask the agent to initialize one (git init).', searchUnavailable: 'Web search is not configured; add a search adapter in settings.'
            }
        }
    }
};
