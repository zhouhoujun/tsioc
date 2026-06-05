import { RequestContext } from '@tsdi/common';

export abstract class Authenticator {
    abstract login(ctx: RequestContext, user: any): Promise<void>;

    abstract logout(ctx: RequestContext): Promise<void>;
}