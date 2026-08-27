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

  /** Public marketing surface: top verified technicians for the app home
   *  screen. Only safe fields - never phone numbers or exact locations. */
  @Get('featured')
  async featured() {
    const pros = await this.prisma.providerProfile.findMany({
      where: { verificationStatus: 'VERIFIED', category: { isActive: true } },
      orderBy: [{ ratingAvg: 'desc' }, { jobsCompleted: 'desc' }, { ratingCount: 'desc' }],
      take: 10,
      select: {
        id: true,
        ratingAvg: true,
        ratingCount: true,
        jobsCompleted: true,
        isAvailable: true,
        subCity: true,
        yearsExperience: true,
        avatarUrl: true,
        user: { select: { name: true } },
        category: {
          select: { id: true, slug: true, nameEn: true, nameAm: true, priceFloorEtb: true },
        },
      },
    });
    return pros.map((p) => ({
      id: p.id,
      name: p.user.name,
      avatarUrl: p.avatarUrl,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      jobsCompleted: p.jobsCompleted,
      isAvailable: p.isAvailable,
      subCity: p.subCity,
      yearsExperience: p.yearsExperience,
      category: p.category,
    }));
  }
}
