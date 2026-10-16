const API_URL =
  "https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines";
const PAGE_SIZE = 1000;
const MAX_PAGES = 10;
const DAYS_AHEAD = 7;
const PARIS_PREFIX = "75";
const PICKS_URL = "/api/screenings";

interface Row {
  showid?: string;
  cineid?: number;
  filmtitle?: string;
  showstart?: string;
  cinenom?: string;
  cineville?: string;
  filmposter?: string;
}

// A saved pick, as returned by GET /api/screenings (only the fields used here)
interface Pick {
  externalCinemaId: number;
  externalShowId: string;
}

const refreshBtn = document.querySelector<HTMLButtonElement>("#refresh")!;
const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const resultsEl = document.querySelector<HTMLUListElement>("#results")!;

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

async function fetchRows(): Promise<Row[]> {
  const now = new Date();
  const end = new Date(now.getTime() + DAYS_AHEAD * 24 * 3600 * 1000);
  let url: string | null =
    `${API_URL}?size=${PAGE_SIZE}` +
    `&select=filmtitle,showstart,cinenom,cineville,filmposter,showid,cineid` +
    `&sort=showstart` +
    `&showstart_gte=${encodeURIComponent(now.toISOString())}` +
    `&showstart_lte=${encodeURIComponent(end.toISOString())}` +
    `&cinecp_starts=${PARIS_PREFIX}`;

  const rows: Row[] = [];
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { results?: Row[]; next?: string };
    rows.push(...(data.results ?? []));
    url = data.next ?? null;
  }
  return rows;
}

// Same text key for a feed row and a saved pick, e.g. "1008422-34304"
function pickKey(cineid: number | undefined, showid: string | undefined): string {
  return `${cineid}-${showid}`;
}

async function fetchPicks(): Promise<Set<string>> {
  const res = await fetch(PICKS_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${PICKS_URL}`);
  const picks = (await res.json()) as Pick[];
  return new Set(picks.map((p) => pickKey(p.externalCinemaId, p.externalShowId)));
}

function setPicked(button: HTMLButtonElement, on: boolean): void {
  button.setAttribute("aria-pressed", String(on));
  button.textContent = on ? "Club Pick" : "Mark as Club Pick";
}

function renderCard(row: Row, picked: Set<string>): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "card";

  const hasPoster = row.filmposter && /^https?:\/\//.test(row.filmposter);
  const poster = document.createElement(hasPoster ? "img" : "div");
  poster.className = "poster";
  if (poster instanceof HTMLImageElement) {
    poster.src = row.filmposter!;
    poster.alt = `Poster of ${row.filmtitle}`;
    poster.loading = "lazy";
    poster.referrerPolicy = "no-referrer";
  }

  const title = document.createElement("h2");
  title.className = "title";
  title.textContent = row.filmtitle!;

  const place = document.createElement("p");
  place.className = "meta";
  place.textContent = [row.cinenom ?? "Unknown cinema", row.cineville]
  .filter(Boolean)
  .join(", ");

  const when = document.createElement("p");
  when.className = "meta";
  when.textContent = dateFormat.format(new Date(row.showstart!));

  const info = document.createElement("div");
  info.className = "info";
  info.append(title, place, when);

  const pick = document.createElement("button");
  pick.type = "button";
  pick.className = "pick";
//   pick.textContent = "Mark as Club Pick";
//   pick.setAttribute("aria-pressed", "false");
//   pick.addEventListener("click", () => {
//   const on = pick.getAttribute("aria-pressed") !== "true";
//   pick.setAttribute("aria-pressed", String(on));
//   pick.textContent = on ? "Club Pick" : "Mark as Club Pick";
  setPicked(pick, picked.has(pickKey(row.cineid, row.showid)));
  pick.addEventListener("click", async () => {
    const wasOn = pick.getAttribute("aria-pressed") === "true";
    setPicked(pick, !wasOn);
    pick.disabled = true;
    try {
      const res = wasOn
        ? await fetch(`${PICKS_URL}/${row.cineid}/${encodeURIComponent(row.showid!)}`, {
            method: "DELETE",
          })
        : await fetch(PICKS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cineid: row.cineid, showid: row.showid }),
          });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error(err);
      setPicked(pick, wasOn);
      setStatus(`Could not save pick: ${(err as Error).message}`, true);
    } finally {
      pick.disabled = false;
    }
  });

  li.append(poster, info, pick);
  return li;
}

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

async function load(): Promise<void> {
  refreshBtn.disabled = true;
  setStatus("Loading…");
  try {
    // const rows = (await fetchRows()).filter((r) => r.filmtitle && r.showstart);
    // resultsEl.replaceChildren(...rows.map(renderCard));
    const picked = await fetchPicks();
    const rows = (await fetchRows()).filter((r) => r.filmtitle && r.showstart);
    resultsEl.replaceChildren(...rows.map((row) => renderCard(row, picked)));
    setStatus(
      rows.length === 0
        ? "No screenings returned by the API."
        : `${rows.length} screening${rows.length === 1 ? "" : "s"} shown`,
    );
  } catch (err) {
    console.error(err);
    setStatus(`Could not load data: ${(err as Error).message}`, true);
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", load);
void load();