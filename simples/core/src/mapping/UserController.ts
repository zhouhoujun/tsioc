import { ApplicationContext, ComponentScan, ConfigureService, Controller, Delete, Get, Post, Put, RequestParam, InternalServerExecption } from '@tsdi/core';
import { lang, Param } from '@tsdi/ioc';
import { Log, Logger } from '@tsdi/logs';
import { Repository, Transactional } from '@tsdi/repository';
import { User } from '../models/models';
import { UserRepository } from '../repositories/UserRepository';

@Controller('/users')
export class UserController {

    constructor(private usrRep: UserRepository, @Log() private logger: Logger) {

    }

    @Get('/')
    search(@RequestParam({ nullable: true }) name: string) {
        return this.usrRep.search(name);
    }

    @Get('/:name')
    getUser(name: string) {
        this.logger.log('name:', name);
        if (name == 'error') {
            throw new InternalServerExecption('error');
        }
        return this.usrRep.findByAccount(name);
    }

    @Transactional()
    @Post('/')
    @Put('/')
    async modify(user: User, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        const val = await this.usrRep.save(user);
        if (check) throw new InternalServerExecption('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @Post('/save')
    @Put('/save')
    async modify2(user: User, @Repository() userRepo: UserRepository, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        const val = await userRepo.save(user);
        if (check) throw new InternalServerExecption('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @Delete('/:id')
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
