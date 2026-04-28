import { AbstractRequestContext } from '@tsdi/endpoints';

export abstract class Authenticator {
    abstract login(ctx: AbstractRequestContext, user: any): Promise<void>;
    
    abstract logout(ctx: AbstractRequestContext): Promise<void>;
}