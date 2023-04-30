import { EventEmitter } from 'events';

export default class Queue<T = any> extends EventEmitter {
  private queue: (() => Promise<T>)[] = [];
  private activeTasks: number = 0;
  private concurrency: number;

  public constructor(concurrency: number) {
    super();
    if (concurrency < 0) {
      throw new Error('Limit cant be lower than 0.');
    }

    this.concurrency = concurrency;
  }

  private registerTask(handler: any) {
    if (this.activeTasks === 0) this.emit('start');
    this.queue = [...this.queue, handler];
    this.executeTasks();
  }

  private executeTasks() {
    while (this.queue.length && this.activeTasks < this.concurrency) {
      const task = this.queue[0];
      this.queue = this.queue.slice(1);
      this.activeTasks += 1;

      if (task)
        task()
          .then((result) => {
            this.activeTasks -= 1;
            this.executeTasks();

            return result;
          })
          .catch((err) => {
            this.activeTasks -= 1;
            this.executeTasks();

            throw err;
          });
    }

    if (this.activeTasks === 0) this.emit('complete');
  }

  public length() {
    return this.activeTasks;
  }

  public task(handler: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => this.registerTask(() => handler().then(resolve).catch(reject)));
  }
}
