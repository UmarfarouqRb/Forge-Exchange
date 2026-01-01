import { IStorage } from '../api/storage';
import { SpotPriceService } from './spotPrice';
import { PerpPriceService } from './perpPrice';

export class MarketService {
  private storage: IStorage;
  private spotPriceService: SpotPriceService;
  private perpPriceService: PerpPriceService;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.spotPriceService = new SpotPriceService(this.storage);
    this.perpPriceService = new PerpPriceService(this.storage);
  }

  start() {
    this.spotPriceService.start();
    this.perpPriceService.start();
  }

  stop() {
    this.spotPriceService.stop();
    this.perpPriceService.stop();
  }
}
