import { ApplicationContext, ComponentScan, Repository, RequestParam, RouteMapping, StartupService, Transactional } from '@tsdi/core';
import { lang } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { User } from '../models/models';
import { UserRepository } from '../repositories/UserRepository';

@RouteMapping('/users')
export class UserController {

    // @Inject() injector!: Injector;
    // @Logger() logger!: ILogger;

    constructor(
        private usrRep: UserRepository,
        @Logger() private logger: ILogger) {

    }


    @RouteMapping('/:name', 'get')
    getUser(name: string) {
        this.logger.log('name:', name);
        return this.usrRep.findByAccount(name);
    }

    @Transactional()
    @RouteMapping('/', 'post')
    @RouteMapping('/', 'put')
    async modify(user: User, @Repository() userRepo: UserRepository, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        let val = await userRepo.save(user);
        if(check) throw new Error('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @RouteMapping('/:id', 'delete')
    async del(id: string) {
        this.logger.log('id:', id);
        await this.usrRep.delete(id);
        return true;
    }

}


@ComponentScan()
export class RouteStartup implements StartupService {

    async configureService(ctx: ApplicationContext): Promise<void> {
        ctx.injector.register(UserController);
    }

}
