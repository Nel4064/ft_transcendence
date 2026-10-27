import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ActivityService } from '../activity/activity.service';

const FEED = 'https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines';
const clean = (v?: string | null) => (v && v !== 'null' && v.trim()) || null;
const VERSION: Record<string, 'VO' | 'VF' | 'VOSTF'> = {
  VO: 'VO', VERSION_ORIGINAL: 'VO', VF: 'VF', VERSION_LOCAL: 'VF', VERSION_ORIGINAL_LOCAL: 'VOSTF',
};

@Injectable()
export class ScreeningsService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  findAll() {
    return this.prisma.screening.findMany({ orderBy: { startsAt: 'asc' } });
  }

  async pick(cineid: number, showid: string) {
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
    await this.activity.notifyAllUsers('CLUB_PICK', {
      screeningId: screening.id,
      filmTitle: screening.filmTitle,
      cinemaName: screening.cinemaName,
      startsAt: screening.startsAt.toISOString(),
    });
    return screening;
  }

  async unpick(cineid: number, showid: string) {
    const key = { externalCinemaId: cineid, externalShowId: showid };
    const screening = await this.prisma.screening.delete({ where: { externalCinemaId_externalShowId: key } });
    await this.activity.notifyAllUsers('CLUB_PICK_REMOVED', {
      screeningId: screening.id,
      filmTitle: screening.filmTitle,
      cinemaName: screening.cinemaName,
      startsAt: screening.startsAt.toISOString(),
    });
    return screening;
  }

}