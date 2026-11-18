import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const FEED = 'https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines';
const clean = (v?: string | null) => (v && v !== 'null' && v.trim()) || null;
const VERSION: Record<string, 'VO' | 'VF' | 'VOSTF'> = {
  VO: 'VO', VERSION_ORIGINAL: 'VO', VF: 'VF', VERSION_LOCAL: 'VF', VERSION_ORIGINAL_LOCAL: 'VOSTF',
};

@Injectable()
export class ScreeningsService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) { }

  findAll() {
    return this.prisma.screening.findMany({ orderBy: { startsAt: 'asc' } });
  }

  async findAllWithRsvpInfo(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });
    const friendIds = friendships.map(f => f.friendId);
    const screenings = await this.prisma.screening.findMany({
      include: {
        _count: {
          select: { rsvps: true },
        },
        rsvps: {
          where: {
            userId: { in: [userId, ...friendIds] },
          },
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
    });

    return screenings.map(screening => {
      const { _count, rsvps, ...rest } = screening;

      const myRsvp = rsvps.find(r => r.userId === userId);
      const friendsRsvps = rsvps.filter(r => r.userId !== userId);

      return {
        ...rest,
        totalGoingCount: _count.rsvps,
        isGoing: !!myRsvp,
        friendsGoingCount: friendsRsvps.length,
        friendsGoing: friendsRsvps.map(r => r.user),
      };
    });
  }

  async pick(cineid: number, showid: string, actorId: string) {
    const res = await fetch(`${FEED}?showid_eq=${encodeURIComponent(showid)}`);
    const r = (await res.json()).results?.[0];
    if (!r) throw new NotFoundException('Screening not in feed');
    const minutes = Math.round(r.filmduration / 60);
    const data = {
      externalCinemaId: r.cineid ?? (cineid || 0),
      externalShowId: r.showid,
      filmTitle: r.filmtitle,
      director: clean(r.filmdirector),
      cast: clean(r.filmcast),
      synopsis: clean(r.filmstoryline),
      genres: clean(r.filmgenre)?.split(',').map((g: string) => g.trim()) ?? [],
      country: clean(r.filmcountry),
      runtimeMinutes: minutes > 0 && minutes < 600 ? minutes : null,
      posterUrl: r.filmposter?.startsWith('https://') ? r.filmposter : null,
      trailerUrl: r.filmtrailer?.startsWith('https://') ? r.filmtrailer : null,
      version: VERSION[r.filmversion] ?? null,
      eventName: clean(r.evenement),
      bookingUrl: clean(r.showurl),
      startsAt: new Date(r.showstart),
      endsAt: new Date(r.showend),
      cinemaName: r.cinenom,
      cinemaAddress: r.cineadresse,
      cinemaPostalCode: r.cinecp,
      cinemaCity: r.cineville,
      cinemaLatitude: r['_coords.lat'] ?? null,
      cinemaLongitude: r['_coords.lon'] ?? null,
    };
    const key = { externalCinemaId: data.externalCinemaId, externalShowId: data.externalShowId };
    const screening = await this.prisma.screening.upsert({
      where: { externalCinemaId_externalShowId: key },
      create: data,
      update: data
    });
    await this.notifications.notifyAllUsers('CLUB_PICK', {
      screeningId: screening.id,
      filmTitle: screening.filmTitle,
      cinemaName: screening.cinemaName,
      startsAt: screening.startsAt.toISOString(),
    }, actorId);

    return screening;
  }

  async unpick(cineid: number, showid: string, actorId: string) {
    const key = { externalCinemaId: cineid || 0, externalShowId: showid };
    const screening = await this.prisma.screening.delete({
      where: { externalCinemaId_externalShowId: key }
    });
    await this.notifications.notifyAllUsers('CLUB_PICK_REMOVED', {
      screeningId: screening.id,
      filmTitle: screening.filmTitle,
      cinemaName: screening.cinemaName,
      startsAt: screening.startsAt.toISOString(),
    }, actorId);
    return screening;
  }

  async findOne(screeningId: string, userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });
    const friendIds = friendships.map(f => f.friendId);
    const screening = await this.prisma.screening.findUnique({
      where: { id: screeningId },
      include: {
        _count: {
          select: { rsvps: true },
        },
        rsvps: {
          where: {
            userId: { in: [userId, ...friendIds] },
          },
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!screening) return null;
    const { _count, rsvps, ...rest } = screening;
    const myRsvp = rsvps.find(r => r.userId === userId);
    const friendsRsvps = rsvps.filter(r => r.userId !== userId);
    return {
      ...rest,
      totalGoingCount: _count.rsvps,
      isGoing: !!myRsvp,
      friendsGoingCount: friendsRsvps.length,
      friendsGoing: friendsRsvps.map(r => r.user),
    };
  }

  async addRsvp(userId: string, screeningId: string) {
    const screening = await this.prisma.screening.findUnique({
      where: { id: screeningId },
      select: { startsAt: true, filmTitle: true }
    });
    if (!screening) {
      throw new NotFoundException("La séance n'est plus disponible.");
    }
    if (screening.startsAt < new Date()) {
      throw new BadRequestException("Vous ne pouvez pas RSVP pour une séance passée.");
    }

    const { count } = await this.prisma.rsvp.createMany({
      data: [{ userId, screeningId }],
      skipDuplicates: true,
    });
    if (count === 0) return { isGoing: true };   // already going: nothing new, nobody to notify

    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });
    const friendIds = friendships.map(f => f.friendId);

    await this.notifications.notifyUsers(
      'FRIEND_RSVP',
      {
        screeningId,
        filmTitle: screening.filmTitle,
        startsAt: screening.startsAt.toISOString(),
      },
      userId,
      friendIds
    );

    return { isGoing: true };
  }

  async removeRsvp(userId: string, screeningId: string) {
    const screening = await this.prisma.screening.findUnique({
      where: { id: screeningId },
      select: { id: true }
    });
    if (!screening) {
      throw new NotFoundException("La séance n'est plus disponible.");
    }
    await this.prisma.rsvp.deleteMany({
      where: {
        userId,
        screeningId
      }
    });
    return { isGoing: false };
  }
}