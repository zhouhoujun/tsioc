import { Controller, Delete, Get, Post, Put, RequestParam } from '@tsdi/transport';
import { lang } from '@tsdi/ioc';
import { Log, Logger } from '@tsdi/logs';
import { InternalServerExecption } from '@tsdi/common';
import { Repository, Transactional } from '@tsdi/repository';
import { User } from '../models/models';
import { UserRepository } from '../repositories/UserRepository';

@Controller('/users')
export class UserController {

    // @Inject() injector!: Injector;
    // @Log() logger!: ILogger;

    constructor(private usrRep: UserRepository, @Log() private logger: Logger) {

    }


    @Get('/:name')
    getUser(name: string) {
        this.logger.log('name:', name);
        return this.usrRep.findByAccount(name);
    }

    @Transactional()
    @Post('/')
    @Put('/')
    async modify(user: User, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        const val = await this.usrRep.save(user);
        if(check) throw new InternalServerExecption('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @Post('/save')
    @Put('/save')
    async modify2(user: User, @Repository() userRepo: UserRepository, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        const val = await userRepo.save(user);
        if(check) throw new InternalServerExecption('check');
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

