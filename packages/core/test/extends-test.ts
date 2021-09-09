import { Abstract, Inject, Injectable, CONTAINER, Container  } from '@tsdi/ioc';


@Injectable()
export class Home {
    getAddress() {
        return 'home';
    }
}

@Abstract()
export abstract class Animal {

    @Inject()
    home!: Home;

    @Inject(CONTAINER)
    container!: Container;

    back() {
        return 'back ' + this.home.getAddress();
    }
}

@Injectable()
export class Person extends Animal {

}
