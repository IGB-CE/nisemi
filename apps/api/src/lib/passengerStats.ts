import { prisma } from './prisma.js';

export interface PassengerStats {
  trips: number;
  likes: number;
  dislikes: number;
  /** Percent of ratings that are likes (0–100), or null when never rated. */
  likePercent: number | null;
}

const emptyStats = (): PassengerStats => ({ trips: 0, likes: 0, dislikes: 0, likePercent: null });

const buildStats = (trips: number, likes: number, dislikes: number): PassengerStats => {
  const total = likes + dislikes;
  return {
    trips,
    likes,
    dislikes,
    likePercent: total > 0 ? Math.round((likes / total) * 100) : null,
  };
};

/**
 * Completed-trip count + like/dislike tallies for a set of passengers.
 * Returns a map keyed by passenger id; missing passengers get empty stats.
 */
export async function getPassengerStats(passengerIds: string[]): Promise<Map<string, PassengerStats>> {
  const result = new Map<string, PassengerStats>();
  const ids = [...new Set(passengerIds)];
  if (ids.length === 0) return result;

  const [tripCounts, ratingCounts] = await Promise.all([
    prisma.reservation.groupBy({
      by: ['passengerId'],
      where: { passengerId: { in: ids }, status: 'ACCEPTED', trip: { status: 'COMPLETED' } },
      _count: { _all: true },
    }),
    prisma.passengerRating.groupBy({
      by: ['passengerId', 'liked'],
      where: { passengerId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const trips = new Map<string, number>();
  for (const row of tripCounts) trips.set(row.passengerId, row._count._all);

  const likes = new Map<string, number>();
  const dislikes = new Map<string, number>();
  for (const row of ratingCounts) {
    (row.liked ? likes : dislikes).set(row.passengerId, row._count._all);
  }

  for (const id of ids) {
    result.set(id, buildStats(trips.get(id) ?? 0, likes.get(id) ?? 0, dislikes.get(id) ?? 0));
  }
  return result;
}

export async function getPassengerStat(passengerId: string): Promise<PassengerStats> {
  const map = await getPassengerStats([passengerId]);
  return map.get(passengerId) ?? emptyStats();
}
