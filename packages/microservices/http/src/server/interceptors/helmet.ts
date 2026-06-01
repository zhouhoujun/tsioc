import { Abstract, ArgumentException, Injectable, Nullable } from '@tsdi/ioc';
import { RequestInterceptor, RequestHandler, RequestContext } from '@tsdi/common';
import { Observable, from, mergeMap } from 'rxjs';
import * as http from 'node:http';
import { HttpHandlerOutput, HttpRequestMessage, HttpServResponse, HTTP_RESPONSE } from '../http-context';

export type XFrameAction = 'DENY' | 'ALLOW-FROM' | 'SAMEORIGIN';

@Abstract()
export abstract class HelmetOptions {
    abstract dnsPrefetch?: 'on' | 'off';
    abstract allowDns?: 'on' | 'off';
    abstract xPoweredBy?: string;
    abstract maxAge?: number;
    abstract includeSubDomains?: boolean;
    abstract preload?: boolean;
    abstract xFrame?: {
        action?: XFrameAction;
        domain?: string;
    };
    abstract xssProtection?: {
        oldIE?: boolean;
        mode?: 'block';
        reportUri?: string;
    };
}

const defOpts = {
    dnsPrefetch: 'off' as const,
    maxAge: 180 * 24 * 60 * 60,
    xFrame: {
        action: 'SAMEORIGIN' as XFrameAction
    }
};

const USER_AGENT = 'user-agent';
const STRICT_TRANSPORT_SECURITY = 'strict-transport-security';
const X_DNS_PREFETCH_CONTROL = 'x-dns-prefetch-control';
const X_DOWNLOAD_OPTIONS = 'x-download-options';
const X_FRAME_OPTIONS = 'x-frame-options';
const X_POWERED_BY = 'x-powered-by';
const X_CONTENT_TYPE_OPTIONS = 'x-content-type-options';
const X_XSS_PROTECTION = 'x-xss-protection';
const IEExp = /msie\s*(\d{1,2})/i;

@Injectable()
export class HelmetMiddleware implements RequestInterceptor<HttpRequestMessage, HttpHandlerOutput, RequestContext> {

    private options: HelmetOptions;

    constructor(@Nullable() options: HelmetOptions) {
        this.options = { ...defOpts, ...options };
    }

    intercept(input: HttpRequestMessage, next: RequestHandler<HttpRequestMessage, HttpHandlerOutput, RequestContext>, context: RequestContext): Observable<HttpHandlerOutput> {
        const res = context.get(HTTP_RESPONSE) as HttpServResponse;
        const req = input;

        res.setHeader(X_DNS_PREFETCH_CONTROL, this.options.dnsPrefetch!);

        this.setXFrameOptions(res);

        this.setPoweredBy(res);

        this.setMaxAge(res);

        res.setHeader(X_DOWNLOAD_OPTIONS, 'noopen');
        res.setHeader(X_CONTENT_TYPE_OPTIONS, 'nosniff');

        this.setXssProtection(res, req as http.IncomingMessage, this.options.xssProtection ?? {});

        return from([input]).pipe(mergeMap(() => next.handle(input, context)));
    }

    private setXFrameOptions(res: HttpServResponse) {
        const xFrame = this.options.xFrame ?? {};
        let action: string = xFrame.action ?? 'SAMEORIGIN';
        if (action === 'ALLOW-FROM') {
            if (!xFrame.domain) {
                throw new ArgumentException('ALLOW-FROM action requires a string domain parameter.');
            }
            action = action + ' ' + xFrame.domain;
        }
        res.setHeader(X_FRAME_OPTIONS, action);
    }

    private setPoweredBy(res: HttpServResponse) {
        const poweredby = this.options.xPoweredBy;
        if (poweredby) {
            res.setHeader(X_POWERED_BY, poweredby);
        } else {
            res.removeHeader(X_POWERED_BY);
        }
    }

    private setMaxAge(res: HttpServResponse) {
        const maxAge = this.options.maxAge!;
        if (maxAge > 0) {
            let age = `max-age=${Math.round(maxAge)}`;
            if (this.options.includeSubDomains) {
                age += '; includeSubDomains';
            }
            if (this.options.preload) {
                age += '; preload';
            }
            res.setHeader(STRICT_TRANSPORT_SECURITY, age);
        }
    }

    private setXssProtection(res: HttpServResponse, req: http.IncomingMessage, xssProt: {
        oldIE?: boolean;
        mode?: 'block';
        reportUri?: string;
    }) {
        const head: string[] = ['1'];
        if (xssProt.mode) {
            head.push('mode=block');
        }
        if (xssProt.reportUri) {
            head.push(`report=${xssProt.reportUri}`);
        }
        const xss = head.join('; ');
        if (xssProt.oldIE) {
            res.setHeader(X_XSS_PROTECTION, xss);
        } else {
            const agent = req.headers[USER_AGENT] as string;
            const old = this.isOldIE(agent);
            res.setHeader(X_XSS_PROTECTION, old ? '0' : xss);
        }
    }

    private isOldIE(agent: string) {
        if (!agent) return false;
        const matches = IEExp.exec(agent);
        return matches ? parseFloat(matches[1]) < 9 : false;
    }
}

export { HelmetMiddleware as Helmet };
