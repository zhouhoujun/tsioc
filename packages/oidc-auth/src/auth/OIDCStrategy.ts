import { Injectable } from '@tsdi/ioc';
import { Authenticator } from '@tsdi/security';
import { UserRepository } from '../repositories/UserRepository';
import { User } from '../models/User';

@Injectable()
export class OIDCStrategy {
    constructor(
        private authenticator: Authenticator,
        private userRepo: UserRepository
    ) {}

    createStrategy() {
        return new OIDCStrategy({
            issuer: process.env.OIDC_ISSUER,
            clientID: process.env.OIDC_CLIENT_ID,
            clientSecret: process.env.OIDC_CLIENT_SECRET,
            callbackURL: process.env.OIDC_CALLBACK_URL,
            scope: 'openid profile email'
        }, async (issuer, profile, done) => {
            try {
                // 查找或创建用户
                let user = await this.userRepo.findOne({ where: { oidcId: profile.id } });
                
                if (!user) {
                    user = new User();
                    user.oidcId = profile.id;
                    user.oidcProvider = issuer;
                    user.oidcProfile = profile;
                    user.username = profile.username || profile.email;
                    user.email = profile.email;
                    user.firstName = profile.given_name;
                    user.lastName = profile.family_name;
                    
                    user = await this.userRepo.save(user);
                }

                // 返回用户信息
                done(null, user);
            } catch (error) {
                done(error);
            }
        });
    }
}
