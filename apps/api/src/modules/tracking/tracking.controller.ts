import { Controller, Get, Param } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { Public } from '../../common/decorators';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly service: TrackingService) {}

  @Public()
  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.service.getByToken(token);
  }
}
