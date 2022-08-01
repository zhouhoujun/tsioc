import { ApplicationContext, ComponentScan, ConfigureService, RequestParam, RouteMapping } from '@tsdi/core';
import { lang } from '@tsdi/ioc';
import { ILogger, Log, Logger } from '@tsdi/logs';
import { Repository, Transactional } from '@tsdi/repository';
import { User } from '../models/models';
import { UserRepository } from '../repositories/UserRepository';

@RouteMapping('/users')
export class UserController {

    // @Inject() injector!: Injector;
    // @Log() logger!: ILogger;

    constructor(private usrRep: UserRepository, @Log() private logger: Logger) {

    }


    @RouteMapping('/:name', 'GET')
    getUser(name: string) {
        this.logger.log('name:', name);
        return this.usrRep.findByAccount(name);
    }

    @Transactional()
    @RouteMapping('/', 'POST')
    @RouteMapping('/', 'PUT')
    async modify(user: User, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        const val = await this.usrRep.save(user);
        if(check) throw new Error('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @RouteMapping('/save', 'POST')
    @RouteMapping('/save', 'PUT')
    async modify2(user: User, @Repository() userRepo: UserRepository, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        const val = await userRepo.save(user);
        if(check) throw new Error('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @RouteMapping('/:id', 'DELETE')
    async del(id: string) {
        this.logger.log('id:', id);
        await this.usrRep.delete(id);
        return true;
    }

}


@ComponentScan()
export class RouteStartup implements ConfigureService {

    async configureService(ctx: ApplicationContext): Promise<void> {
        ctx.injector.register(UserController);
    }

}
