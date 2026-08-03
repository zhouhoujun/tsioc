import * as path from 'path';
import { Command } from 'commander';

export const SUPPORTED_COMPLETION_SHELLS = ['bash', 'zsh', 'fish'] as const;

export type AgentCompletionShell = (typeof SUPPORTED_COMPLETION_SHELLS)[number];

interface CompletionCandidate {
    value: string;
    description?: string;
    expectsValue?: boolean;
}

interface CompletionState {
    path: string[];
    candidates: CompletionCandidate[];
}

const COMPLETION_POSITIONAL_CANDIDATES: Record<string, CompletionCandidate[]> = {
    completion: SUPPORTED_COMPLETION_SHELLS.map(shell => ({
        value: shell,
        description: `${shell} shell completion script`
    }))
};

export function resolveCompletionShell(shell?: string | null, env: NodeJS.ProcessEnv = process.env): AgentCompletionShell {
    const normalized = String(shell || '').trim().toLowerCase();
    if (normalized) {
        if ((SUPPORTED_COMPLETION_SHELLS as readonly string[]).includes(normalized)) {
            return normalized as AgentCompletionShell;
        }
        throw new Error(`Unsupported shell: ${shell}. Expected one of ${SUPPORTED_COMPLETION_SHELLS.join(', ')}.`);
    }

    const inferred = path.basename(String(env.SHELL || '')).trim().toLowerCase();
    if ((SUPPORTED_COMPLETION_SHELLS as readonly string[]).includes(inferred)) {
        return inferred as AgentCompletionShell;
    }
    return 'bash';
}

export function generateAgentCompletionScript(shell: AgentCompletionShell, program: Command): string {
    const states = createCompletionStates(program);
    switch (shell) {
        case 'bash':
            return renderBashCompletion(states);
        case 'zsh':
            return renderZshCompletion(states);
        case 'fish':
            return renderFishCompletion(states);
    }
}

function createCompletionStates(program: Command): CompletionState[] {
    const states: CompletionState[] = [];
    const visit = (command: Command, currentPath: string[]) => {
        states.push({
            path: currentPath,
            candidates: mergeCandidates(
                collectSubcommandCandidates(command, currentPath.length === 0),
                collectOptionCandidates(command),
                resolvePositionalCandidates(currentPath)
            )
        });

        for (const child of command.commands) {
            visit(child, [...currentPath, child.name()]);
        }
    };

    visit(program, []);

    const helpStates: CompletionState[] = [];
    for (const state of states) {
        if (!state.path.length) {
            helpStates.push({
                path: ['help'],
                candidates: state.candidates.filter(candidate => !candidate.value.startsWith('-'))
            });
            continue;
        }
        helpStates.push({
            path: ['help', ...state.path],
            candidates: state.candidates.filter(candidate => !candidate.value.startsWith('-'))
        });
    }

    return [...states, ...helpStates];
}

function collectSubcommandCandidates(command: Command, includeHelp: boolean): CompletionCandidate[] {
    const candidates: CompletionCandidate[] = [];
    for (const child of command.commands) {
        candidates.push({
            value: child.name(),
            description: child.description() || undefined
        });
    }
    if (includeHelp) {
        candidates.push({
            value: 'help',
            description: 'Display help for a command.'
        });
    }
    return candidates;
}

function collectOptionCandidates(command: Command): CompletionCandidate[] {
    const candidates: CompletionCandidate[] = [];
    for (const option of command.options || []) {
        const expectsValue = option.flags.includes('<') || option.flags.includes('[');
        const description = option.description || undefined;
        const tokens = [option.short, option.long].filter((token): token is string => Boolean(token));
        for (const token of tokens) {
            candidates.push({
                value: token,
                description,
                expectsValue
            });
        }
    }
    return candidates;
}

function resolvePositionalCandidates(currentPath: string[]): CompletionCandidate[] {
    return COMPLETION_POSITIONAL_CANDIDATES[currentPath.join(' ')] || [];
}

function mergeCandidates(...candidateGroups: CompletionCandidate[][]): CompletionCandidate[] {
    const merged: CompletionCandidate[] = [];
    const seen = new Set<string>();
    for (const group of candidateGroups) {
        for (const candidate of group) {
            if (seen.has(candidate.value)) {
                continue;
            }
            seen.add(candidate.value);
            merged.push(candidate);
        }
    }
    return merged;
}

function collectValueFlags(states: CompletionState[]): string[] {
    const flags = new Set<string>();
    for (const state of states) {
        for (const candidate of state.candidates) {
            if (candidate.expectsValue && candidate.value.startsWith('-')) {
                flags.add(candidate.value);
            }
        }
    }
    return Array.from(flags);
}

function renderBashCompletion(states: CompletionState[]): string {
    const valueFlags = collectValueFlags(states);
    const lines = [
        '_tsdi_agent_completion() {',
        '    local cur prev token path candidates skip index',
        '    COMPREPLY=()',
        '    cur="${COMP_WORDS[COMP_CWORD]}"',
        '    prev=""',
        '    if (( COMP_CWORD > 0 )); then',
        '        prev="${COMP_WORDS[COMP_CWORD-1]}"',
        '    fi',
        `    local value_flags=${bashWordList(valueFlags)}`,
        '    case " ${value_flags} " in',
        '        *" ${prev} "*)',
        '            return 0',
        '            ;;',
        '    esac',
        '    path=""',
        '    skip=0',
        '    for (( index = 1; index < COMP_CWORD; index++ )); do',
        '        token="${COMP_WORDS[index]}"',
        '        if (( skip == 1 )); then',
        '            skip=0',
        '            continue',
        '        fi',
        '        case " ${value_flags} " in',
        '            *" ${token} "*)',
        '                skip=1',
        '                continue',
        '                ;;',
        '        esac',
        '        if [[ "${token}" == -* ]]; then',
        '            continue',
        '        fi',
        '        if [[ -n "${path}" ]]; then',
        '            path="${path} ${token}"',
        '        else',
        '            path="${token}"',
        '        fi',
        '    done',
        '    candidates=""',
        '    case "${path}" in',
        ...renderShellCases(states, 'bash'),
        '        *)',
        '            candidates=""',
        '            ;;',
        '    esac',
        '    COMPREPLY=( $(compgen -W "${candidates}" -- "${cur}") )',
        '}',
        'complete -F _tsdi_agent_completion tsdi-agent'
    ];
    return lines.join('\n');
}

function renderZshCompletion(states: CompletionState[]): string {
    const valueFlags = collectValueFlags(states);
    const lines = [
        '#compdef tsdi-agent',
        '_tsdi_agent() {',
        '    local -a path_tokens candidates value_flags',
        '    local token path_key prev',
        '    local skip_next=0',
        `    value_flags=(${zshWordList(valueFlags)})`,
        '    if (( CURRENT > 1 )); then',
        '        prev="${words[CURRENT-1]}"',
        '        if (( ${value_flags[(I)${prev}]} )); then',
        '            return 0',
        '        fi',
        '    fi',
        '    path_tokens=()',
        '    for (( index = 2; index < CURRENT; index++ )); do',
        '        token="${words[index]}"',
        '        if (( skip_next )); then',
        '            skip_next=0',
        '            continue',
        '        fi',
        '        if (( ${value_flags[(I)${token}]} )); then',
        '            skip_next=1',
        '            continue',
        '        fi',
        '        if [[ "${token}" == -* ]]; then',
        '            continue',
        '        fi',
        '        path_tokens+=("${token}")',
        '    done',
        '    path_key="${(j: :)path_tokens}"',
        '    case "${path_key}" in',
        ...renderShellCases(states, 'zsh'),
        '        *)',
        '            candidates=()',
        '            ;;',
        '    esac',
        '    _describe "tsdi-agent" candidates',
        '}',
        'compdef _tsdi_agent tsdi-agent'
    ];
    return lines.join('\n');
}

function renderFishCompletion(states: CompletionState[]): string {
    const valueFlags = collectValueFlags(states);
    const lines = [
        'function __tsdi_agent_needs_value',
        '    set -l words (commandline -opc)',
        '    if test (count $words) -eq 0',
        '        return 1',
        '    end',
        '    set -l prev $words[-1]',
        '    switch $prev',
        ...valueFlags.map(flag => `        case ${fishWord(flag)}\n            return 0`),
        '    end',
        '    return 1',
        'end',
        '',
        'function __tsdi_agent_command_path',
        '    set -l words (commandline -opc)',
        '    set -l path',
        '    set -l skip_next 0',
        '    for index in (seq 2 (count $words))',
        '        set -l token $words[$index]',
        '        if test $skip_next -eq 1',
        '            set skip_next 0',
        '            continue',
        '        end',
        '        switch $token',
        ...valueFlags.map(flag => `            case ${fishWord(flag)}\n                set skip_next 1\n                continue`),
        '        end',
        '        if string match -qr \'^-\' -- $token',
        '            continue',
        '        end',
        '        set path $path $token',
        '    end',
        '    string join " " $path',
        'end',
        '',
        'function __tsdi_agent_complete',
        '    if __tsdi_agent_needs_value',
        '        return 0',
        '    end',
        '    switch (__tsdi_agent_command_path)',
        ...renderFishCases(states),
        '        case "*"',
        '            return 0',
        '    end',
        'end',
        '',
        'complete -c tsdi-agent -f -a "(__tsdi_agent_complete)"'
    ];
    return lines.join('\n');
}

function renderShellCases(states: CompletionState[], shell: 'bash' | 'zsh'): string[] {
    const lines: string[] = [];
    for (const state of states) {
        const key = state.path.join(' ');
        lines.push(`        ${shellCaseLabel(key)})`);
        if (shell === 'bash') {
            lines.push(`            candidates=${bashWordList(state.candidates.map(candidate => candidate.value))}`);
        } else {
            lines.push(`            candidates=(${zshDescribeList(state.candidates)})`);
        }
        lines.push('            ;;');
    }
    return lines;
}

function renderFishCases(states: CompletionState[]): string[] {
    const lines: string[] = [];
    for (const state of states) {
        const key = state.path.join(' ');
        lines.push(`        case ${fishWord(key || '')}`);
        if (!state.candidates.length) {
            lines.push('            return 0');
            continue;
        }
        for (const candidate of state.candidates) {
            if (candidate.description) {
                lines.push(`            printf '%s\\t%s\\n' ${fishWord(candidate.value)} ${fishWord(candidate.description)}`);
            } else {
                lines.push(`            printf '%s\\n' ${fishWord(candidate.value)}`);
            }
        }
    }
    return lines;
}

function shellCaseLabel(value: string): string {
    return value ? bashWord(value) : "''";
}

function bashWordList(values: string[]): string {
    return bashWord(values.join(' '));
}

function zshWordList(values: string[]): string {
    return values.map(value => zshWord(value)).join(' ');
}

function zshDescribeList(candidates: CompletionCandidate[]): string {
    return candidates
        .map(candidate => `${zshWord(`${candidate.value}:${escapeZshDescription(candidate.description || '')}`)}`)
        .join(' ');
}

function bashWord(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

function zshWord(value: string): string {
    return bashWord(value);
}

function fishWord(value: string): string {
    return bashWord(value);
}

function escapeZshDescription(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}
