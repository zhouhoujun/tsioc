import { Controller, Delete, Get, Post, Put, RequestParam, RequestPath } from '@tsdi/core';
import { lang } from '@tsdi/ioc';
import { Log, Logger } from '@tsdi/logs';
import { Repository, Transactional } from '@tsdi/repository';
import { HttpInternalServerError } from '@tsdi/transport-http';
import { Repository as TypeOrmRepository } from 'typeorm';
import { User } from '../models/models';

@Controller('/users')
export class UserController {

    // @Inject() injector!: Injector;
    // @Log() logger!: ILogger;

    constructor(@Repository(User) private usrRep:  TypeOrmRepository<User>, @Log() private logger: Logger) {

    }

    @Get('/:name')
    getUser(@RequestPath() name: string) {
        this.logger.log('name:', name);
        return this.usrRep.findOne({ where: { account: name } });
    }

    @Transactional()
    @Post('/')
    @Put('/')
    async modify(user: User, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        const val = await this.usrRep.save(user);
        if (check) throw new HttpInternalServerError('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @Post('/save')
    @Put('/save')
    async modify2(user: User, @Repository(User) userRepo: TypeOrmRepository<User>, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        const val = await userRepo.save(user);
        if (check) throw new HttpInternalServerError('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @Delete('/:id')
    async del(@RequestPath() id: string) {
        this.logger.log('id:', id);
        await this.usrRep.delete(id);
        return true;
    }

}

