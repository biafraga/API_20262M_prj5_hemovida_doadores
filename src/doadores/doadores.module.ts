import { Module } from '@nestjs/common';
import { DoadoresService } from './doadores.service';
import { DoadoresController } from './doadores.controller';

@Module({
  controllers: [DoadoresController],
  providers: [DoadoresService],
})
export class DoadoresModule {}
