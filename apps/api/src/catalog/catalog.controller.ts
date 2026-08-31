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

  // NOTE: there is deliberately no public "featured technicians" endpoint.
  // Client rule 2026-08-29: a customer never sees a technician's identity
  // until that technician has accepted their job (or Ops assigned one).
}
