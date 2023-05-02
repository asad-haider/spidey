import { OutputFormat } from './interfaces.js';

export class Constants {
  static readonly DEFAULT_CONCURRENCY = 10;
  static readonly DEFAULT_DELAY = 0;
  static readonly DEFAULT_RETRIES = 0;
  static readonly DEFAULT_DEBUG_LEVEL = 'debug';
  static readonly DEFAULT_OUTPUT_FORMAT: OutputFormat = 'json';
  static readonly DEFAULT_OUTPUT_FILE_NAME = 'data';
  static readonly DEFAULT_RETRY_STATUS_CODE = [500, 502, 503, 504, 522, 524, 408, 429];
  static readonly DEFAULT_SPIDEY_STATE = false;
}
