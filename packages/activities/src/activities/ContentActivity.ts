import { SequenceActivity } from './Sequence';
import { Task } from '../decorators';
import { ActivityContext } from '../core';

@Task('body')
@Task('content')
export class ContentActivity<T extends ActivityContext> extends SequenceActivity<T> {

}
