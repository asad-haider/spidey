import { Spidey, SpideyOptions, SpideyPipeline, SpideyResponse } from '../dist/index';
interface Data {
  url: string;
  asin: string;
  title: string;
}

export class ASINPipeline implements SpideyPipeline {
  constructor(private options?: SpideyOptions) {}

  process(data: Data) {
    data.url = data.url.split('/ref').shift() as string;
    data.asin = data.url.split('/').pop() as string;
    return data;
  }
}

class AmazonSpidey extends Spidey {
  constructor() {
    super({
      concurrency: 50,
      retries: 5,
      logLevel: 'debug',
      pipelines: [ASINPipeline],
    });
  }

  headers = {
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
  };

  startUrls = [
    'https://www.amazon.de/-/en/gp/bestsellers/beauty/64272031/ref=zg_bs_nav_beauty_1',
    'https://www.amazon.de/-/en/gp/bestsellers/beauty/122877031/ref=zg_bs_nav_beauty_1',
    'https://www.amazon.de/-/en/gp/bestsellers/beauty/64486031/ref=zg_bs_nav_beauty_1',
  ];

  start() {
    for (const url of this.startUrls) {
      this.request(
        {
          url,
          headers: this.headers,
        },
        this.parse.bind(this),
      );
    }
  }

  parse(response: SpideyResponse) {
    const productUrls = new Set<string>();
    response.$('#gridItemRoot .p13n-sc-uncoverable-faceout > a').each((index: number, element: any) => {
      productUrls.add(response.$(element).attr('href'));
    });

    productUrls.forEach((url) => {
      url = `https://www.amazon.de${url}`;
      this.request(
        {
          url,
          headers: this.headers,
          meta: {
            url,
          },
        },
        this.parseProduct.bind(this),
      );
    });
  }

  parseProduct(response: SpideyResponse) {
    const url = response.meta.url;
    const title = response.xpath('//*[@id="productTitle"]/text()')[0].data.trim();
    this.save({ url, title });
  }
}

new AmazonSpidey().start();
