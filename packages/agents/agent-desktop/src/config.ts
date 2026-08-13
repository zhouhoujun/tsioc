/**
 * Desktop shell configuration resolution.
 *
 * Precedence: CLI argv > environment > defaults. Values are validated where
 * they affect security (gateway URL protocol) and parsed to numbers/booleans
 * for window sizing. Kept free of node API usage so it is unit-testable with
 * plain argv/env objects.
 */

import { normalizeGatewayUrl } from './desktop-html';

export interface DesktopAppOptions {
    /** Window title */
    title: string;
    /** Gateway base URL, e.g. http://127.0.0.1:3000 */
    gatewayUrl: string;
    /** Optional gateway bearer token */
    token: string;
    /** Initial session id (empty = fresh session) */
    sessionId: string;
    /** Workspace label shown in the console */
    workspace: string;
    /** Initial window width */
    width: number;
    /** Initial window height */
    height: number;
    /** Show a system tray icon */
    tray: boolean;
    /** Close-to-tray: hide the window instead of quitting */
    closeToTray: boolean;
    /** Start with the window hidden */
    startHidden: boolean;
    /** Quit the app when the last window closes */
    quitOnAllClosed: boolean;
    /** Enforce a single application instance */
    singleInstance: boolean;
}

export const DEFAULT_DESKTOP_OPTIONS: DesktopAppOptions = {
    title: 'TSDI Agent',
    gatewayUrl: 'http://127.0.0.1:3000',
    token: '',
    sessionId: '',
    workspace: '',
    width: 1200,
    height: 800,
    tray: true,
    closeToTray: true,
    startHidden: false,
    quitOnAllClosed: true,
    singleInstance: true
};

function flagValue(argv: string[], name: string): string | undefined {
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === `--${name}` && i + 1 < argv.length) {
            return argv[i + 1];
        }
        if (arg.startsWith(`--${name}=`)) {
            return arg.slice(name.length + 3);
        }
    }
    return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
    return argv.includes(`--${name}`) || argv.some(arg => arg.startsWith(`--${name}=`));
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value === '') {
        return fallback;
    }
    return value === 'true' || value === '1' || value === 'yes';
}

function parseNumber(value: string | undefined, fallback: number): number {
    if (value === undefined || value === '') {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveDesktopConfig(
    argv: string[] = [],
    env: Record<string, string | undefined> = {}
): DesktopAppOptions {
    const envOf = (name: string): string | undefined => env[name] ?? undefined;
    const gatewayUrl = flagValue(argv, 'gateway-url') ?? envOf('TSDI_AGENT_GATEWAY_URL') ?? DEFAULT_DESKTOP_OPTIONS.gatewayUrl;

    const options: DesktopAppOptions = {
        title: flagValue(argv, 'title') ?? envOf('TSDI_AGENT_TITLE') ?? DEFAULT_DESKTOP_OPTIONS.title,
        gatewayUrl: normalizeGatewayUrl(gatewayUrl),
        token: flagValue(argv, 'token') ?? envOf('TSDI_AGENT_TOKEN') ?? DEFAULT_DESKTOP_OPTIONS.token,
        sessionId: flagValue(argv, 'session-id') ?? envOf('TSDI_AGENT_SESSION_ID') ?? DEFAULT_DESKTOP_OPTIONS.sessionId,
        workspace: flagValue(argv, 'workspace') ?? envOf('TSDI_AGENT_WORKSPACE') ?? DEFAULT_DESKTOP_OPTIONS.workspace,
        width: parseNumber(flagValue(argv, 'width') ?? envOf('TSDI_AGENT_WIDTH'), DEFAULT_DESKTOP_OPTIONS.width),
        height: parseNumber(flagValue(argv, 'height') ?? envOf('TSDI_AGENT_HEIGHT'), DEFAULT_DESKTOP_OPTIONS.height),
        tray: parseBoolean(flagValue(argv, 'tray') ?? envOf('TSDI_AGENT_TRAY'), DEFAULT_DESKTOP_OPTIONS.tray),
        closeToTray: parseBoolean(flagValue(argv, 'close-to-tray') ?? envOf('TSDI_AGENT_CLOSE_TO_TRAY'), DEFAULT_DESKTOP_OPTIONS.closeToTray),
        startHidden: parseBoolean(flagValue(argv, 'start-hidden') ?? envOf('TSDI_AGENT_START_HIDDEN'), DEFAULT_DESKTOP_OPTIONS.startHidden),
        quitOnAllClosed: parseBoolean(flagValue(argv, 'quit-on-all-closed') ?? envOf('TSDI_AGENT_QUIT_ON_ALL_CLOSED'), DEFAULT_DESKTOP_OPTIONS.quitOnAllClosed),
        singleInstance: !hasFlag(argv, 'no-single-instance')
    };
    return options;
}
