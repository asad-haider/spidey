import { AxiosResponse } from 'axios';

export interface SpideyOptions {
  concurrency?: number;
  delay?: number;
  retries?: number;
  retryStatusCode?: number[];
  itemConcurrency?: number;
  outputFormat?: OutputFormat;
  outputFileName?: string;
  logLevel?: 'info' | 'debug' | 'error';
}

export interface RequestOptions {
  url: string;
  method?: string;
  headers?: any;
  body?: any;
  json?: boolean;
  timeout?: number;
  meta?: any;
  inline?: boolean;
}

export interface SpideyResponse extends AxiosResponse {
  $: any;
  meta?: any;
}

export declare type OutputFormat = 'json' | 'csv' | 'tsv' | 'txt';
export declare type SpideyResponseCallback = (response: SpideyResponse) => void;
