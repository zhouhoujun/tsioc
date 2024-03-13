import { Abstract, ArgumentExecption, EMPTY_OBJ, Injectable, Nullable } from '@tsdi/ioc';
import { AssetContext, Middleware } from '@tsdi/endpoints';


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
export class HelmetMiddleware implements Middleware<AssetContext> {

    private options: HelmentOptions;
    
    constructor(@Nullable() options: HelmentOptions) {
        this.options = { ...defOpts, ...options };
    }

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {
        ctx.setHeader(X_DNS_PREFETCH_CONTROL, this.options.dnsPrefetch!);

        this.setXFormOptions(ctx);

        this.setPoweredBy(ctx);

        this.setMaxAge(ctx);

        ctx.setHeader(X_DOWNLOAD_OPTIONS, 'noopen');
        ctx.setHeader(X_CONTENT_TYPE_OPTIONS, 'nosniff');

        this.setXssProtection(ctx, this.options.xssProtection ?? EMPTY_OBJ);

        await next();
    }

    protected setXFormOptions(ctx: AssetContext) {
        const xFrame = this.options.xFrame ?? EMPTY_OBJ;
        let action = xFrame.action ?? 'SAMEORIGIN';
        if (action === 'ALLOW-FROM') {
            if (!xFrame.domain) {
                throw new ArgumentExecption('ALLOW-FROM action requires a string domain parameter.');
            }
            action = action + ' ' + xFrame;
        }
        ctx.setHeader(X_FRAME_OPTIONS, action);
    }

    protected setPoweredBy(ctx: AssetContext) {
        const poweredby = this.options.xPoweredBy;
        poweredby ? ctx.setHeader(X_POWERED_BY, poweredby) : ctx.removeHeader(X_POWERED_BY);
    }

    protected setMaxAge(ctx: AssetContext) {
        const maxAge = this.options.maxAge!;
        if (maxAge > 0) {
            let age = `max-age=${Math.round(maxAge)}`;
            if (this.options.includeSubDomains) {
                age += '; includeSubDomains'
            }
            if (this.options.preload) {
                age += '; preload'
            }
            ctx.setHeader(STRICT_TRANSPORT_SECURITY, age);
        }
    }

    protected setXssProtection(ctx: AssetContext, xssProt: {
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
            ctx.setHeader(X_XSS_PROTECTION, xss);
        } else {
            const old = this.isOldIE(ctx.getHeader(USER_AGENT) as string);
            ctx.setHeader(X_XSS_PROTECTION, old ? '0' : xss);
        }
    }

    private isOldIE(agent: string) {
        if (!agent) return false;
        const matches = IEExp.exec(agent);
        return matches ? parseFloat(matches[1]) < 9 : false
    }

}

const USER_AGENT = 'user-agent';
const STRICT_TRANSPORT_SECURITY = 'strict-transport-security';

const X_DNS_PREFETCH_CONTROL = 'x-dns-prefetch-control';
const X_DOWNLOAD_OPTIONS = 'x-download-options';
const X_FRAME_OPTIONS = 'x-frame-options';
const X_POWERED_BY = 'x-powered-by';
const X_CONTENT_TYPE_OPTIONS = 'x-content-type-options';
const X_XSS_PROTECTION = 'x-xss-protection';






const IEExp = /msie\s*(\d{1,2})/i;
