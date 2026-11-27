import type { GatewayDoctorReport } from './controller';

export interface DoctorOptions {
    /** Admin base URL, e.g. `http://127.0.0.1:3000` or a full doctor path. */
    url: string;
    token?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}

export interface DoctorResult {
    ok: boolean;
    report: GatewayDoctorReport;
}

export function doctorUrl(base: string): string {
    const trimmed = base.replace(/\/+$/, '');
    return trimmed.endsWith('/api/gateway-admin/doctor')
        ? trimmed
        : `${trimmed}/api/gateway-admin/doctor`;
}

export async function runDoctor(options: DoctorOptions): Promise<DoctorResult> {
    const fetchImpl = options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
    try {
        const response = await fetchImpl(doctorUrl(options.url), {
            headers: options.token ? { authorization: `Bearer ${options.token}` } : undefined,
            signal: controller.signal
        });
        if (response.status === 401) {
            throw new Error('doctor endpoint returned 401: pass --token <admin token> or set GATEWAY_ADMIN_TOKEN');
        }
        if (!response.ok) {
            throw new Error(`doctor endpoint returned ${response.status}; check that the admin console is running at ${options.url}`);
        }
        const report = await response.json() as GatewayDoctorReport;
        return { ok: report.status !== 'warn', report };
    } finally {
        clearTimeout(timeout);
    }
}

export function formatDoctorReport(report: GatewayDoctorReport): string {
    const lines = [
        `gateway doctor: ${report.status.toUpperCase()}`,
        `version: ${report.version}  routes: ${report.routes}  services: ${report.services.length}  open circuits: ${report.openCircuits}  alerts: ${report.alerts}`,
        ''
    ];
    report.checks.forEach(check => {
        lines.push(`[${check.status}] ${check.id}: ${check.message}`);
    });
    (report.capabilities ?? []).forEach(capability => {
        const warning = capability.warnings.length ? ` warnings=${capability.warnings.length}` : '';
        lines.push(`[capability] ${capability.name}: delivery=${capability.delivery} idempotent=${capability.consumerIdempotency} ordering=${capability.ordering}${warning}`);
    });
    return lines.join('\n');
}

function parseArgs(argv: string[]): { url: string; token?: string; json: boolean } {
    let url = process.env.GATEWAY_ADMIN_URL ?? 'http://127.0.0.1:3000';
    let token = process.env.GATEWAY_ADMIN_TOKEN;
    let json = false;
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === '--url') {
            url = argv[++index] ?? url;
        } else if (arg === '--token') {
            token = argv[++index];
        } else if (arg === '--json') {
            json = true;
        } else if (!arg.startsWith('-')) {
            url = arg;
        }
    }
    return { url, token, json };
}

if (require.main === module) {
    const options = parseArgs(process.argv.slice(2));
    runDoctor(options)
        .then(result => {
            console.log(options.json ? JSON.stringify(result.report, null, 2) : formatDoctorReport(result.report));
            process.exit(result.ok ? 0 : 1);
        })
        .catch(error => {
            console.error('gateway doctor failed:', (error as Error).message);
            process.exit(1);
        });
}
