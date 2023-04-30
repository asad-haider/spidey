import { OutputFormat } from './interfaces.js';

export class Constants {
  static readonly DEFAULT_CONCURRENCY = 10;
  static readonly DEFAULT_DELAY = 0;
  static readonly DEFAULT_OUTPUT_FORMAT: OutputFormat = 'json';
  static readonly DEFAULT_OUTPUT_FILE_NAME = 'data';
}
