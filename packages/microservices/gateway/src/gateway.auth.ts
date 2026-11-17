import { HTTP_AUTH_RESULT, HttpRequestMessage } from '@tsdi/http-microservice';
import { RequestContext } from '@tsdi/common';
import { HttpAuthService, HmacSignatureService } from '@tsdi/security';
import { GatewayOptions, ResolvedGatewayRoute } from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';
import { asStringArray, getClientIp, getHeaderValue, matchClaimValue, matchesIp, normalizeGatewayUrl } from './gateway.http';

/**
 * Gateway authentication/authorization pipeline: JWT auth, API keys, HMAC
 * signatures, claim checks and IP access control.
 *
 * Extracted from `GatewayInterceptor` so the interceptor only orchestrates
 * request flow. Behavior and error shapes are unchanged.
 */
export class GatewayAuth {
    constructor(
        private readonly options: GatewayOptions,
        private readonly runtime: GatewayRuntime,
        private readonly authService: HttpAuthService,
        private readonly signatureService: HmacSignatureService
    ) { }

    async authorize(route: ResolvedGatewayRoute, request: HttpRequestMessage, context: RequestContext): Promise<void> {
        const auth = route.auth;
        if (!auth) {
            return;
        }
        const result = await this.authService.authenticate(request as any, auth);
        request._auth = result as any;
        context.set(HTTP_AUTH_RESULT, result as any);
        if (!result.authenticated) {
            throw Object.assign(new Error('Unauthorized gateway request'), {
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }
    }

    validateApiKey(route: ResolvedGatewayRoute, request: HttpRequestMessage): void {
        const options = route.apiKey;
        if (!options) {
            return;
        }
        const headerName = options.header ?? 'x-api-key';
        const queryName = options.query ?? 'api_key';
        const value = getHeaderValue(request, headerName)
            ?? (queryName ? request.query?.[queryName] : undefined);
        if (!value || !options.keys.includes(String(value))) {
            throw Object.assign(new Error('Invalid gateway api key'), {
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }
    }

    async validateSignature(route: ResolvedGatewayRoute, request: HttpRequestMessage): Promise<void> {
        const options = route.signature;
        if (!options) {
            return;
        }
        const signatureHeader = options.header ?? 'x-signature';
        const nonceHeader = options.nonceHeader ?? 'x-nonce';
        const timestampHeader = options.timestampHeader ?? 'x-timestamp';
        const signature = getHeaderValue(request, signatureHeader);
        const timestamp = getHeaderValue(request, timestampHeader);
        const nonce = getHeaderValue(request, nonceHeader);
        if (!signature || !timestamp) {
            throw Object.assign(new Error('Missing gateway signature headers'), {
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }
        const ts = Number(timestamp);
        const maxSkew = options.maxSkew ?? 300_000;
        if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > maxSkew) {
            throw Object.assign(new Error('Gateway signature expired'), {
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }
        if (options.preventReplay && nonce) {
            const accepted = await this.runtime.rememberNonce(`${route.path}:${nonce}`, maxSkew);
            if (!accepted) {
                throw Object.assign(new Error('Gateway signature replay detected'), {
                    statusCode: 409,
                    statusMessage: 'Conflict'
                });
            }
        }
        const body = request.rawBody ?? JSON.stringify(request.body ?? '');
        const canonical = [
            request.method ?? 'GET',
            this.normalizeRequestUrl(request.url ?? '/'),
            timestamp,
            nonce ?? '',
            typeof body === 'string' ? body : body.toString()
        ].join('\n');
        const verified = this.signatureService.verify(canonical, signature, options.secret, {
            algorithm: options.algorithm,
            encoding: options.encoding
        });
        if (!verified) {
            throw Object.assign(new Error('Invalid gateway signature'), {
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }
    }

    enforceAuthorization(route: ResolvedGatewayRoute, request: HttpRequestMessage): void {
        const options = route.authorize;
        if (!options) {
            return;
        }
        const claims = request._auth?.claims ?? {};
        const matchAny = options.matchAny ?? false;
        const roleValues = asStringArray(claims.role ?? claims.roles);
        const scopeValues = asStringArray(claims.scope ?? claims.scopes);
        const roleMatched = !options.roles?.length
            ? undefined
            : (matchAny
                ? options.roles.some(role => roleValues.includes(role))
                : options.roles.every(role => roleValues.includes(role)));
        const scopeMatched = !options.scopes?.length
            ? undefined
            : (matchAny
                ? options.scopes.some(scope => scopeValues.includes(scope))
                : options.scopes.every(scope => scopeValues.includes(scope)));
        const claimsMatched = !options.claims
            ? undefined
            : Object.entries(options.claims).every(([key, expected]) => matchClaimValue(claims[key], expected));

        const checks = [roleMatched, scopeMatched, claimsMatched].filter(v => v !== undefined) as boolean[];
        if (checks.length === 0) {
            return;
        }
        const passed = matchAny ? checks.some(Boolean) : checks.every(Boolean);
        if (!passed) {
            throw Object.assign(new Error('Forbidden gateway request'), {
                statusCode: 403,
                statusMessage: 'Forbidden'
            });
        }
    }

    enforceAccessControl(route: ResolvedGatewayRoute, request: HttpRequestMessage): void {
        const acl = route.accessControl;
        if (!acl) {
            return;
        }
        const ip = getClientIp(request);
        if (!ip) {
            return;
        }
        if (acl.denyIps?.some(rule => matchesIp(rule, ip))) {
            throw Object.assign(new Error('Gateway access denied'), {
                statusCode: 403,
                statusMessage: 'Forbidden'
            });
        }
        if (acl.allowIps?.length && !acl.allowIps.some(rule => matchesIp(rule, ip))) {
            throw Object.assign(new Error('Gateway access denied'), {
                statusCode: 403,
                statusMessage: 'Forbidden'
            });
        }
    }

    private normalizeRequestUrl(url: string): string {
        const defaults = this.runtime.getOption('defaults', this.options.defaults);
        return normalizeGatewayUrl(url, defaults?.prefix);
    }
}
