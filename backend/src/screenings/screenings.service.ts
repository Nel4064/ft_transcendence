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

  // ----------------------------------------------------
  // 💡 新增：带有用户 RSVP 和 好友状态的加强版查询
  // ----------------------------------------------------
  async findAllWithRsvpInfo(userId: string) {
    // 1. 获取好友 ID
    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });
    const friendIds = friendships.map(f => f.friendId);

    // 2. 查出所有的排片，同时把属于"我"和"好友"的 rsvp 挂载在结果上
    const screenings = await this.prisma.screening.findMany({
      include: {
        _count: {
          select: { rsvps: true }, // 总报名人数
        },
        rsvps: {
          where: {
            userId: { in: [userId, ...friendIds] },
          },
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
    });

    // 3. 处理数据并返回
    return screenings.map(screening => {
      const { _count, rsvps, ...rest } = screening;

      const myRsvp = rsvps.find(r => r.userId === userId);
      const friendsRsvps = rsvps.filter(r => r.userId !== userId);

      return {
        ...rest,
        totalGoingCount: _count.rsvps,               // 所有的 going
        isGoing: !!myRsvp,                           // 我是否 going
        friendsGoingCount: friendsRsvps.length,      // 几个好朋友 going
        friendsGoing: friendsRsvps.map(r => r.user), // 具体朋友的数据
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
      await this.prisma.rsvp.create({
        data: { userId, screeningId }
      });
      return { isGoing: true };
    }
  }

}