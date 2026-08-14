import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories')
  categories() {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { nameEn: 'asc' },
    });
  }
}
