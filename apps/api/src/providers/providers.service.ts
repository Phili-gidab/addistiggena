import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDocumentDto, UpsertProfileDto } from './providers.dto';

export interface NearbyProvider {
  id: string;
  name: string | null;
  bio: string | null;
  subCity: string | null;
  woreda: string | null;
  yearsExperience: number | null;
  ratingAvg: number;
  ratingCount: number;
  jobsCompleted: number;
  lat: number | null;
  lng: number | null;
  distanceM: number;
}

/** A dispatchable technician, with the contact fields the notifier needs. */
export interface DispatchCandidate {
  id: string;
  userId: string;
  name: string | null;
  phone: string;
  telegramChatId: string | null;
  distanceM: number;
}

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertProfile(userId: string, dto: UpsertProfileDto) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || !category.isActive) throw new BadRequestException('Unknown service category');

    const vetting = {
      subCity: dto.subCity,
      woreda: dto.woreda,
      faydaIdNumber: dto.faydaIdNumber,
      yearsExperience: dto.yearsExperience,
      guarantorName: dto.guarantorName,
      guarantorPhone: dto.guarantorPhone,
    };
    const [profile] = await this.prisma.$transaction([
      this.prisma.providerProfile.upsert({
        where: { userId },
        update: {
          categoryId: dto.categoryId,
          bio: dto.bio,
          serviceRadiusKm: dto.serviceRadiusKm,
          ...vetting,
        },
        create: {
          userId,
          categoryId: dto.categoryId,
          bio: dto.bio,
          serviceRadiusKm: dto.serviceRadiusKm ?? 5,
          ...vetting,
        },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { role: 'PROVIDER' } }),
    ]);
    await this.prisma.wallet.upsert({
      where: { providerId: profile.id },
      update: {},
      create: { providerId: profile.id },
    });
    return profile;
  }

  async getProfileByUser(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
      include: { category: true, documents: true, wallet: true },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');
    return profile;
  }

  async setAvailability(userId: string, isAvailable: boolean) {
    const profile = await this.getProfileByUser(userId);
    if (isAvailable && profile.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException('Only verified providers can go online');
    }
    return this.prisma.providerProfile.update({
      where: { id: profile.id },
      data: { isAvailable },
    });
  }

  async setLocation(userId: string, lat: number, lng: number) {
    const profile = await this.getProfileByUser(userId);
    await this.prisma.$executeRaw`
      UPDATE "ProviderProfile"
      SET "lat" = ${lat}, "lng" = ${lng}, "locationUpdatedAt" = now(),
          "location" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      WHERE "id" = ${profile.id}`;
    return { ok: true };
  }

  async registerDocument(userId: string, dto: RegisterDocumentDto) {
    const profile = await this.getProfileByUser(userId);
    return this.prisma.providerDocument.create({
      data: { providerId: profile.id, type: dto.type, objectKey: dto.objectKey },
    });
  }

  /** Ranked verified+available providers whose service radius covers the given point. */
  nearby(lat: number, lng: number, categoryId: string): Promise<NearbyProvider[]> {
    return this.prisma.$queryRaw<NearbyProvider[]>(Prisma.sql`
      SELECT p."id",
             u."name",
             p."bio",
             p."subCity",
             p."woreda",
             p."yearsExperience",
             p."ratingAvg",
             p."ratingCount",
             p."jobsCompleted",
             p."lat",
             p."lng",
             ST_Distance(p."location", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS "distanceM"
      FROM "ProviderProfile" p
      JOIN "User" u ON u."id" = p."userId"
      WHERE p."verificationStatus" = 'VERIFIED'
        AND p."isAvailable" = true
        AND p."categoryId" = ${categoryId}
        AND p."location" IS NOT NULL
        AND ST_DWithin(
              p."location",
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              p."serviceRadiusKm" * 1000)
      ORDER BY p."ratingAvg" DESC, "distanceM" ASC
      LIMIT 10`);
  }

  /**
   * Ranked dispatch candidates for the offer cascade (proposal §3 "Real-Time Discovery"):
   * same filter as nearby(), minus technicians the booking was already offered to.
   */
  candidates(
    lat: number,
    lng: number,
    categoryId: string,
    excludeIds: string[],
  ): Promise<DispatchCandidate[]> {
    const exclusion = excludeIds.length
      ? Prisma.sql`AND p."id" NOT IN (${Prisma.join(excludeIds)})`
      : Prisma.empty;
    return this.prisma.$queryRaw<DispatchCandidate[]>(Prisma.sql`
      SELECT p."id",
             p."userId",
             u."name",
             u."phone",
             u."telegramChatId",
             ST_Distance(p."location", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS "distanceM"
      FROM "ProviderProfile" p
      JOIN "User" u ON u."id" = p."userId"
      WHERE p."verificationStatus" = 'VERIFIED'
        AND p."isAvailable" = true
        AND p."categoryId" = ${categoryId}
        AND p."location" IS NOT NULL
        AND ST_DWithin(
              p."location",
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              p."serviceRadiusKm" * 1000)
        ${exclusion}
      ORDER BY p."ratingAvg" DESC, "distanceM" ASC
      LIMIT 5`);
  }
}
