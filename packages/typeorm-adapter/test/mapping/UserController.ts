import { ApplicationContext, Boot, RouteMapping, StartupService } from '@tsdi/core';
import { Inject, Injector, lang } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { User } from '../models/models';
import { UserRepository } from '../repositories/UserRepository';

@RouteMapping('/users')
export class UserController {

    @Inject() injector!: Injector;
    @Logger() logger!: ILogger;

    constructor(public usrRep: UserRepository) {

    }


    @RouteMapping('/:name', 'get')
    getUser(name: string) {
        this.logger.log('name:', name);
        return this.usrRep.findByAccount(name);
    }

    @RouteMapping('/', 'post')
    @RouteMapping('/', 'put')
    async modify(user: User) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        let val = await this.usrRep.save(user);
        this.logger.log(val);
        return val;
    }

    @RouteMapping('/:id', 'delete')
    async del(id: string) {
        this.logger.log('id:', id);
        await this.usrRep.delete(id);
        return true;
    }

}


@Boot()
export class RouteStartup extends StartupService {
   
    override async configureService(ctx: ApplicationContext): Promise<void> {
        ctx.injector.register(UserController);
    }

}
