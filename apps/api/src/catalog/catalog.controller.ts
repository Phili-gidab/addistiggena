import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active categories in the order of the company's price list, each with its
   * published price lines. Every price a customer sees - web or app - comes
   * from here, so a new price list is a seed run rather than a code change.
   */
  @Get('categories')
  categories() {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
      include: {
        prices: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, nameEn: true, nameAm: true, minEtb: true, maxEtb: true, unit: true },
        },
      },
    });
  }

  // NOTE: there is deliberately no public "featured technicians" endpoint.
  // Client rule 2026-08-29: a customer never sees a technician's identity
  // until that technician has accepted their job (or Ops assigned one).
}
