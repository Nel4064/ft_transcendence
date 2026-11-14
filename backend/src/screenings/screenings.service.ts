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

  async findOne(screeningId: string, userId: string) {
    // 逻辑和 findAllWithRsvpInfo 类似，但只查一条数据
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

    // 格式化返回数据，和列表页保持一致，前端就能直接用了！
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

  // ==========================================
  // 2. 报名 RSVP (使用 PUT，幂等操作)
  // ==========================================
  async addRsvp(userId: string, screeningId: string) {
    // 检查 1：活动是否存在？
    const screening = await this.prisma.screening.findUnique({
      where: { id: screeningId },
      select: { startsAt: true } // 为了性能，我们只查需要的时间字段
    });

    if (!screening) {
      throw new NotFoundException("La séance n'est plus disponible.");
    }

    // 检查 2：活动是不是已经过去了？(满足队友 refuser les séances passées 的要求)
    if (screening.startsAt < new Date()) {
      throw new BadRequestException("Vous ne pouvez pas RSVP pour une séance passée.");
    }

    // 🌟 核心技巧：使用 upsert 代替 create
    // upsert 的意思是：如果记录不存在，就 create；如果已经存在，就 update。
    // 这样就算用户手抖狂点按钮发了 10 个请求，数据库也不会报 500 Unique Constraint 错误！
    await this.prisma.rsvp.upsert({
      where: {
        userId_screeningId: { userId, screeningId }
      },
      update: {}, // 如果已经存在，我们什么都不用改
      create: {
        userId,
        screeningId
      }
    });

    return { isGoing: true };
  }

  // ==========================================
  // 3. 取消报名 (使用 DELETE，幂等操作)
  // ==========================================
  async removeRsvp(userId: string, screeningId: string) {
    // 按照队友要求，同样先检查活动在不在
    const screening = await this.prisma.screening.findUnique({
      where: { id: screeningId },
      select: { id: true }
    });

    if (!screening) {
      throw new NotFoundException("La séance n'est plus disponible.");
    }

    // 🌟 核心技巧：使用 deleteMany 代替 delete
    // delete：如果找不到记录，Prisma 会报错抛出异常。
    // deleteMany：如果找不到记录，Prisma 会静默跳过（影响行数为 0）。
    // 这完美实现了“幂等性”：删一次和删十次结果一样，都不会报错。
    await this.prisma.rsvp.deleteMany({
      where: {
        userId,
        screeningId
      }
    });

    return { isGoing: false };
  }
}