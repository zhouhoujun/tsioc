import { Injectable } from '@tsdi/ioc';
import { RequestContext } from '@tsdi/endpoints';

@Injectable()
export class OIDCService {
    private issuer: string;
    private clientID: string;
    private clientSecret: string;
    private callbackURL: string;

    constructor() {
        this.issuer = process.env.OIDC_ISSUER || '';
        this.clientID = process.env.OIDC_CLIENT_ID || '';
        this.clientSecret = process.env.OIDC_CLIENT_SECRET || '';
        this.callbackURL = process.env.OIDC_CALLBACK_URL || '';
    }



    authenticate() {
    }

    authenticateCallback() {
      
    }
}
