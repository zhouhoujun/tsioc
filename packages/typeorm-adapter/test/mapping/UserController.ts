import { Controller, Delete, Get, Post, Put, RequestParam, RequestPath } from '@tsdi/endpoints';
import { lang } from '@tsdi/ioc';
import { InternalServerExecption } from '@tsdi/common';
import { Log, Logger } from '@tsdi/logger';
import { Repository, Transactional } from '@tsdi/repository';
import { Repository as TypeormRepository } from 'typeorm';
import { User } from '../models/models';
import { UserService } from './user.service';

@Controller('/users')
export class UserController {

    constructor(private usrService: UserService, @Log() private logger: Logger) {

    }

    @Get('/')
    search(@RequestParam({ nullable: true }) name: string) {
        return this.usrService.search(name);
    }

    @Get('/:name')
    getUser(@RequestPath() name: string) {
        this.logger.log('name:', name);
        if (name == 'error') {
            throw new InternalServerExecption('error');
        }
        return this.usrService.findByAccount(name);
    }

    @Post('/')
    @Put('/')
    async modify(user: User, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrService), user);
        const val = await this.usrService.save(user, check);
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @Post('/save')
    @Put('/save')
    async modify2(user: User, @Repository(User) userRepo: TypeormRepository<User>, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrService), user);
        const val = await userRepo.save(user);
        if (check) throw new InternalServerExecption('check');
        this.logger.log(val);
        return val;
    }

    @Delete('/:id')
    async del(@RequestPath() id: string, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log('id:', id);
        await this.usrService.delete(id, check);
        return true;
    }

}