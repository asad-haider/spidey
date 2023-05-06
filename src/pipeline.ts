import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { SpideyOptions, SpideyPipeline } from './interfaces';

export class JsonPipeline implements SpideyPipeline {
  private fileName: string;

  constructor(private options?: SpideyOptions) {
    this.fileName = this.options?.outputFileName as string;
    writeFileSync(this.fileName, '[\n');
  }

  process(data: any) {
    appendFileSync(this.fileName, JSON.stringify(data) + ',\n');
    return data;
  }

  complete() {
    this.replaceLastComma();
    appendFileSync(this.fileName, ']');
  }

  private replaceLastComma() {
    let content = readFileSync(this.fileName, 'utf-8');
    content = content.replace(/,\n$/, '\n');
    writeFileSync(this.fileName, content);
  }
}
