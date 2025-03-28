import { Controller, Get, Post } from '@tsdi/endpoints';
import { OIDCService } from '../auth/OIDCService';

@Controller('/auth')
export class AuthController {
    constructor(private oidcService: OIDCService) {}

    @Get('/login')
    login() {
        return this.oidcService.authenticate();
    }

    @Get('/callback')
    callback() {
        return this.oidcService.authenticateCallback();
    }

    @Get('/logout')
    logout() {
        // 登出逻辑
    }
}
