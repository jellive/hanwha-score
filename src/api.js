const BASE_URL = "https://api-gw.sports.naver.com";

export async function fetchTodayGames() {
  const today = formatDate(new Date());
  const url = `${BASE_URL}/schedule/games?fields=basic&date=${today}&upperCategoryId=kbaseball&categoryId=kbo`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.result?.games || [];
  } catch {
    return [];
  }
}

export async function fetchGameDetail(gameId) {
  const url = `${BASE_URL}/schedule/games/${gameId}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
