import { Injectable, NotFoundException } from '@nestjs/common';
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
      where: {
        startsAt: {
          gte: new Date(),
        },
      },
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
    const res = await fetch(`${FEED}?cineid_eq=${cineid}&showid_eq=${encodeURIComponent(showid)}`);
    const r = (await res.json()).results?.[0];
    if (!r) throw new NotFoundException('Screening not in feed');
    const minutes = Math.round(r.filmduration / 60);
    const data = {
      externalCinemaId: r.cineid,
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
    const screening = await this.prisma.screening.upsert({ where: { externalCinemaId_externalShowId: key }, create: data, update: data });
    await this.notifications.notifyAllUsers('CLUB_PICK', {
      screeningId: screening.id,
      filmTitle: screening.filmTitle,
      cinemaName: screening.cinemaName,
      startsAt: screening.startsAt.toISOString(),
    }, actorId);
    return screening;
  }

  async unpick(cineid: number, showid: string, actorId: string) {
    const key = { externalCinemaId: cineid, externalShowId: showid };
    const screening = await this.prisma.screening.delete({ where: { externalCinemaId_externalShowId: key } });
    await this.notifications.notifyAllUsers('CLUB_PICK_REMOVED', {
      screeningId: screening.id,
      filmTitle: screening.filmTitle,
      cinemaName: screening.cinemaName,
      startsAt: screening.startsAt.toISOString(),
    }, actorId);
    return screening;
  }

  async toggleRsvp(userId: string, screeningId: string) {
    const existing = await this.prisma.rsvp.findUnique({
      where: { userId_screeningId: { userId, screeningId } }
    });

    if (existing) {
      await this.prisma.rsvp.delete({ where: { id: existing.id } });
      return { isGoing: false };
    } else {
      // 在执行 create 之前，先查一下场次还在不在
      const screening = await this.prisma.screening.findUnique({
        where: { id: screeningId }
      });
      if (!screening) {
        throw new NotFoundException("La séance n'est plus disponible.");
      }
      // 查得到，说明是安全的，执行插入
      await this.prisma.rsvp.create({
        data: { userId, screeningId }
      });
      return { isGoing: true };
    }
  }
}