import Bottleneck from 'bottleneck';

interface QueueOptions {
  concurrency: number;
  delay?: number;
}

export default class Queue<T = any> {
  private queue: Bottleneck;

  public constructor(options: QueueOptions) {
    if (options.concurrency < 0) {
      throw new Error('Concurrency cannot be lower than 0.');
    }

    this.queue = new Bottleneck({ maxConcurrent: options.concurrency, minTime: options.delay });
  }

  public length() {
    const counts = this.queue.counts();
    return counts.EXECUTING + counts.QUEUED + counts.RECEIVED + counts.RUNNING;
  }

  public task(handler: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => this.queue.schedule(() => handler().then(resolve).catch(reject)));
  }
}
