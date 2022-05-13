import { Middleware, TransportContext } from '@tsdi/core';
import { Abstract, ArgumentError, EMPTY_OBJ, Injectable, Nullable } from '@tsdi/ioc';
import { hdr } from '../consts';


export type XFrameAction = 'DENY' | 'ALLOW-FROM' | 'SAMEORIGIN';

@Abstract()
export abstract class HelmentOptions {
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
    dnsPrefetch: 'off',
    maxAge: 180 * 24 * 60 * 60,
    xFrame: {
        action: 'SAMEORIGIN'
    }
} as HelmentOptions;

@Injectable()
export class HelmetMiddleware implements Middleware {

    private options: HelmentOptions
    constructor(@Nullable() options: HelmentOptions) {
        this.options = {
            ...defOpts,
            ...options
        };
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        ctx.setHeader(hdr.X_DNS_PREFETCH_CONTROL, this.options.dnsPrefetch!);

        this.setXFormOptions(ctx);

        this.setPoweredBy(ctx);

        this.setMaxAge(ctx);

        ctx.setHeader(hdr.X_DOWNLOAD_OPTIONS, 'noopen');
        ctx.setHeader(hdr.X_CONTENT_TYPE_OPTIONS, 'nosniff');

        this.setXssProtection(ctx, this.options.xssProtection ?? EMPTY_OBJ);

        await next();
    }

    protected setXFormOptions(ctx: TransportContext) {
        let xFrame = this.options.xFrame ?? EMPTY_OBJ;
        let action = xFrame.action ?? 'SAMEORIGIN';
        if (action === 'ALLOW-FROM') {
            if (!xFrame.domain) {
                throw new ArgumentError('ALLOW-FROM action requires a string domain parameter.');
            }
            action = action + ' ' + xFrame;
        }
        ctx.setHeader(hdr.X_FRAME_OPTIONS, action);
    }

    protected setPoweredBy(ctx: TransportContext) {
        const poweredby = this.options.xPoweredBy;
        poweredby ? ctx.setHeader(hdr.X_POWERED_BY, poweredby) : ctx.removeHeader(hdr.X_POWERED_BY);
    }

    protected setMaxAge(ctx: TransportContext) {
        const maxAge = this.options.maxAge!;
        if (maxAge > 0) {
            let age = `max-age=${Math.round(maxAge)}`;
            if (this.options.includeSubDomains) {
                age += '; includeSubDomains'
            }
            if (this.options.preload) {
                age += '; preload'
            }
            ctx.setHeader(hdr.STRICT_TRANSPORT_SECURITY, age);
        }
    }

    protected setXssProtection(ctx: TransportContext, xssProt: {
        oldIE?: boolean;
        mode?: 'block';
        reportUri?: string;
    }) {
        let head: string[] = ['1'];
        if (xssProt.mode) {
            head.push('mode=block');
        }
        if (xssProt.reportUri) {
            head.push(`report=${xssProt.reportUri}`);
        }
        const xss = head.join('; ');
        if (xssProt.oldIE) {
            ctx.setHeader(hdr.X_XSS_PROTECTION, xss);
        } else {
            let old = this.isOldIE(ctx.getHeader(hdr.USER_AGENT) as string);
            ctx.setHeader(hdr.X_XSS_PROTECTION, old ? '0' : xss);
        }
    }

    private isOldIE(agent: string) {
        if (!agent) return false;
        let matches = IEExp.exec(agent);
        return matches ? parseFloat(matches[1]) < 9 : false
    }

}

const IEExp = /msie\s*(\d{1,2})/i;
