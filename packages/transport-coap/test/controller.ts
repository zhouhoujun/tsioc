import { RedirectResult, Get, Handle, Payload, Post, RequestBody, RequestParam, RequestPath, RouteMapping } from '@tsdi/transport';
import { lang } from '@tsdi/ioc';
import { BadRequestExecption } from '@tsdi/common';
import { of } from 'rxjs';



@RouteMapping('/device')
export class DeviceController {

    @Post('/init')
    req(@RequestParam() name: string) {
        console.log('DeviceController init:', name);
        return { name };
    }

    @RouteMapping('/usage', 'POST')
    age(@RequestBody() id: string, @RequestBody('age', { pipe: 'int' }) year: number, @RequestBody({ pipe: 'date' }) createAt: Date) {
        console.log('usage:', id, year, createAt);
        return { id, year, createAt };
    }

    @Get('/usege/find')
    agela(@RequestParam('age', { pipe: 'int' }) limit: number) {
        console.log('limit:', limit);
        return limit;
    }

    @Get('/:age/used')
    resfulquery(@RequestPath('age', { pipe: 'int' }) age1: number) {
        console.log('age1:', age1);
        if (age1 <= 0) {
            throw new BadRequestExecption();
        }
        return age1;
    }


    @RouteMapping('/update', 'POST')
    async update(version: string) {
        // do smth.
        console.log('update version:', version);
        const defer = lang.defer();

        setTimeout(() => {
            defer.resolve(version);
        }, 10);

        return await defer.promise;
    }

    @Get('/status')
    getLastStatus(@RequestParam('redirect', { nullable: true }) redirect: string) {
        if (redirect === 'reload') {
            return new RedirectResult('/device/reload');
        }
        return of('working');
    }

    @Get('/reload')
    redirect() {
        return 'reload';
    }



    @Handle({ cmd: 'xxx' }, 'coap')
    async subMessage(@Payload() message: string) {
        return message;
    }

    @Handle('dd/*')
    async subMessage1(@Payload() message: string) {
        return message;
    }





}
