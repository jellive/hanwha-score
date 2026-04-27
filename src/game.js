// Pure helpers for picking the Hanwha game out of a KBO daily schedule
// and pulling Hanwha-relative scores out of it. Pure functions only —
// no chrome.* and no fetch — so these are safely unit-testable in node.

const HANWHA = "HH";

/**
 * Find today's Hanwha game from a KBO schedule list. Returns undefined
 * when Hanwha isn't playing today (offseason / day off / cancellation
 * filtered upstream).
 *
 * KBO doubleheaders are exceedingly rare (rain make-ups). Today's UI
 * only tracks one game at a time, so we return the FIRST match — caller
 * can decide if it wants to enrich for doubleheader cases.
 */
export function findHanwhaGame(games) {
  if (!Array.isArray(games)) return undefined;
  return games.find(
    (g) => g && (g.homeTeamCode === HANWHA || g.awayTeamCode === HANWHA),
  );
}

/**
 * From a single Hanwha game object, return scores + opponent metadata
 * with Hanwha as the FIRST value regardless of home/away.
 */
export function getHanwhaScore(game) {
  const isHome = game.homeTeamCode === HANWHA;
  return {
    hanwha: isHome ? game.homeTeamScore : game.awayTeamScore,
    opponent: isHome ? game.awayTeamScore : game.homeTeamScore,
    opponentName: isHome ? game.awayTeamName : game.homeTeamName,
    opponentLogo: isHome ? game.awayTeamEmblemUrl : game.homeTeamEmblemUrl,
    hanwhaLogo: isHome ? game.homeTeamEmblemUrl : game.awayTeamEmblemUrl,
  };
}
