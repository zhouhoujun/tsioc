import 'reflect-metadata';
import { ContainerBuilder, AutoWired, Injectable } from './index';
class SimppleAutoWried {
    @AutoWired()
    dateProperty: Date;
}


let builder = new ContainerBuilder();
let container = builder.build();
container.register(SimppleAutoWried);
let instance = container.get(SimppleAutoWried);
console.log(instance.dateProperty);


@Injectable()
class RoomService {
    constructor() {

    }
    @AutoWired()
    current: Date;
}

@Injectable()
class ClassRoom {
    constructor(public service: RoomService) {

    }
}


container.register(ClassRoom);
let room = container.get(ClassRoom);
console.log(room.service.current);
