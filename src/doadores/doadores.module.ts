import { Module } from '@nestjs/common';
import { DoadoresService } from './doadores.service';
import { DoadoresController } from './doadores.controller';
import { Ms4Module } from '../ms4/ms4.module';
import { DoadoresInternalController } from './doadores-internal.controller';

@Module({
  imports: [Ms4Module],
  controllers: [DoadoresController, DoadoresInternalController],
  providers: [DoadoresService],
})
export class DoadoresModule {}
