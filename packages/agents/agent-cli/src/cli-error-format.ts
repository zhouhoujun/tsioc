import { asModelFailure, describeModelFailure } from '@tsdi/agent';

export interface CliErrorFormatOptions {
    debug?: boolean;
}

/**
 * Formats a failure for stderr. Structured model failures (quota, auth, rate limit,
 * timeout, ...) are user-actionable, so they render as one actionable line instead of
 * an internal stack trace. Every other error keeps the previous stack-first behavior.
 */
export function formatCliError(error: unknown, options: CliErrorFormatOptions = {}): string {
    const failure = asModelFailure(error);
    if (failure) {
        const message = describeModelFailure(failure);
        const stack = error instanceof Error ? error.stack : undefined;
        return options.debug && stack ? `${message}\n${stack}` : message;
    }
    if (error instanceof Error) {
        return error.stack || error.message;
    }
    return String(error);
}

export function isCliDebugEnabled(env: Record<string, string | undefined> = process.env): boolean {
    return env.TSDI_AGENT_DEBUG === '1' || env.TSDI_AGENT_DEBUG === 'true';
}
