import { appendFileSync, existsSync, writeFileSync } from 'fs';
import { SpideyOptions, SpideyPipeline } from './interfaces';

export class JsonPipeline implements SpideyPipeline {
  private fileName: string;

  constructor(private options?: SpideyOptions) {
    this.fileName = this.options?.outputFileName as string;
    writeFileSync(this.fileName, '[\n');
  }

  process(data: any, last?: boolean) {
    if (last) appendFileSync(this.fileName, JSON.stringify(data) + '\n');
    else appendFileSync(this.fileName, JSON.stringify(data) + ',\n');
    return data;
  }

  complete() {
    appendFileSync(this.fileName, ']');
  }
}
