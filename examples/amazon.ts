import { Spidey, SpideyResponse } from '../lib/index';

class AmazonSpidey extends Spidey {
  constructor() {
    super({
      concurrency: 10,
    });
  }

  startUrls = [
    'https://www.amazon.com/Ninja-BL770AMZ-Kitchen-Processor-1500-Watt/dp/B098RDGJNQ',
    'https://www.amazon.com/Crave-Naturals-Glide-Detangling-Adults/dp/B015VEB9AO',
    'https://www.amazon.com/LiBa-Massager-Trigger-Fibromyalgia-Massage/dp/B07P5PFFMZ',
    'https://www.amazon.com/Scala-Microfiber-Hair-Towel-Wrap/dp/B086W2Y9TV',
  ];

  parse(response: SpideyResponse) {
    const title = response.$('#productTitle').text().trim();
    console.log(title);
  }
}

new AmazonSpidey().start();
