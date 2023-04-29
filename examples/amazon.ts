import { Spidey, SpideyResponse } from '../lib/index';

class AmazonSpidey extends Spidey {
  constructor() {
    super({
      concurrency: 10,
    });
  }

  headers = {
    authority: 'www.amazon.com',
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-US,en;q=0.9',
    'device-memory': '8',
    downlink: '10',
    dpr: '2',
    ect: '4g',
    referer: 'https://www.amazon.com/',
    rtt: '50',
    'sec-ch-device-memory': '8',
    'sec-ch-dpr': '2',
    'sec-ch-ua': '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-ch-ua-platform-version': '"13.2.1"',
    'sec-ch-viewport-width': '1680',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    'viewport-width': '1680',
  };

  startUrls = [
    'https://www.amazon.com/Ninja-BL770AMZ-Kitchen-Processor-1500-Watt/dp/B098RDGJNQ',
    'https://www.amazon.com/Crave-Naturals-Glide-Detangling-Adults/dp/B015VEB9AO',
    'https://www.amazon.com/LiBa-Massager-Trigger-Fibromyalgia-Massage/dp/B07P5PFFMZ',
    'https://www.amazon.com/Scala-Microfiber-Hair-Towel-Wrap/dp/B086W2Y9TV',
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
    console.log(response.config.url);
    const title = response.$('#productTitle').text().trim();
    this.save({ title });
  }
}

new AmazonSpidey().start();
