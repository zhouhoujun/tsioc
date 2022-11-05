import { BadRequestExecption, Handle, RequestBody, RequestParam, RequestPath, RouteMapping } from '@tsdi/core';
import { lang } from '@tsdi/ioc';
import { RedirectResult } from '@tsdi/transport';
import {  of } from 'rxjs';



@RouteMapping('/device')
export class DeviceController {

    @RouteMapping('/init', 'POST')
    req(name: string) {
        console.log('DeviceController init:', name);
        return { name };
    }

    @RouteMapping('/usage', 'POST')
    age(id: string, @RequestBody('age', { pipe: 'int' }) year: number, @RequestBody({ pipe: 'date' }) createAt: Date) {
        console.log('usage:', id, year, createAt);
        return { id, year, createAt };
    }

    @RouteMapping('/usege/find', 'MESSAGE')
    agela(@RequestParam('age', { pipe: 'int' }) limit: number) {
        console.log('limit:', limit);
        return limit;
    }

    @RouteMapping('/:age/used', 'MESSAGE')
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

    @RouteMapping('/status', 'MESSAGE')
    getLastStatus(@RequestParam('redirect', { nullable: true }) redirect: string) {
        if (redirect === 'reload') {
            return new RedirectResult('/device/reload');
        }
        return of('working');
    }

    @RouteMapping('/reload', 'MESSAGE')
    redirect() {
        return 'reload';
    }



    @Handle({ cmd: 'xxx', protocol: 'tcp' })
    async subMessage() {

    }

    @Handle(/dd./, 'tcp')
    async subMessage1() {

    }

}
