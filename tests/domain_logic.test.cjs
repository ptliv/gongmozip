const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const rootDir = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const target = path.join(rootDir, "src", request.slice(2));
    if (fs.existsSync(`${target}.ts`)) return `${target}.ts`;
    if (fs.existsSync(`${target}.tsx`)) return `${target}.tsx`;
    return target;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { dedupePublicContests, getContestDedupeKey } = require("../src/lib/contest-dedupe.ts");
const { getContestPrizeInfo } = require("../src/lib/prize.ts");

function contest(overrides = {}) {
  return {
    id: overrides.id ?? "id-1",
    slug: overrides.slug ?? "sample",
    title: overrides.title ?? "같은 제목 공모전",
    organizer: overrides.organizer ?? "같은 주최",
    summary: overrides.summary ?? "요약",
    description: overrides.description ?? "설명",
    poster_image_url: overrides.poster_image_url ?? "https://example.com/poster.webp",
    type: overrides.type ?? "공모전",
    category: overrides.category ?? "기타",
    field: overrides.field ?? "기타",
    target: overrides.target ?? ["누구나"],
    region: overrides.region ?? "전국",
    online_offline: overrides.online_offline ?? "온라인",
    team_allowed: overrides.team_allowed ?? false,
    apply_start_at: overrides.apply_start_at ?? "2026-06-01",
    apply_end_at: overrides.apply_end_at ?? "2026-07-31",
    status: overrides.status ?? "ongoing",
    benefit: overrides.benefit ?? { types: [] },
    official_source_url: overrides.official_source_url ?? "https://official.example.com",
    aggregator_source_url: overrides.aggregator_source_url ?? null,
    source_site: overrides.source_site ?? "test",
    source_url: overrides.source_url ?? "https://source.example.com",
    official_url: overrides.official_url ?? "https://official.example.com",
    external_id: overrides.external_id ?? null,
    raw_payload: overrides.raw_payload ?? null,
    crawled_at: overrides.crawled_at ?? "2026-06-30T00:00:00Z",
    source_checked_at: overrides.source_checked_at ?? "2026-06-30T00:00:00Z",
    is_verified: overrides.is_verified ?? false,
    verified_level: overrides.verified_level ?? 1,
    review_score: overrides.review_score ?? 80,
    view_count: overrides.view_count ?? 0,
    created_at: overrides.created_at ?? "2026-06-30T00:00:00Z",
    updated_at: overrides.updated_at ?? "2026-06-30T00:00:00Z",
  };
}

test("dedupe keeps same title and deadline when organizers differ", () => {
  const items = [
    contest({ id: "a", organizer: "서울시", review_score: 99 }),
    contest({ id: "b", organizer: "부산시", review_score: 100 }),
  ];

  assert.equal(getContestDedupeKey(items[0]), "같은-제목-공모전|서울시|2026-07-31");
  assert.deepEqual(dedupePublicContests(items).map((item) => item.id), ["a", "b"]);
});

test("dedupe collapses exact title organizer deadline and keeps better row", () => {
  const items = [
    contest({ id: "lower", review_score: 70, updated_at: "2026-06-29T00:00:00Z" }),
    contest({ id: "higher", review_score: 95, updated_at: "2026-06-28T00:00:00Z" }),
  ];

  assert.deepEqual(dedupePublicContests(items).map((item) => item.id), ["higher"]);
});

test("prize display formats bare won amount and removes unitless small total", () => {
  const info = getContestPrizeInfo(
    contest({
      benefit: {
        text: "최고상: 1000000 / 총상금: 4",
        types: [],
      },
    })
  );

  assert.ok(info);
  assert.equal(info.amountLabel, "100만원");
  assert.equal(info.text, "최고상: 100만원");
});

test("prize display keeps total prize scale context", () => {
  const totalPrizeText = "\uc2dc\uc0c1 \uaddc\ubaa8 \ucd1d 4.2\uc5b5 \uc6d0";
  const info = getContestPrizeInfo(contest({ benefit: { text: totalPrizeText, types: [] } }));

  assert.ok(info);
  assert.equal(info.amountLabel, "\ucd1d \uc2dc\uc0c1\uaddc\ubaa8 4\uc5b5 2,000\ub9cc\uc6d0");
  assert.equal(info.text, totalPrizeText);
});

test("noindex collection pages cap server rendered contest grids", () => {
  const files = [
    ["deadline", "src/app/(main)/deadline/page.tsx", /getDeadlineContestsPayload\(12\)/],
    [
      "deadline 7 days",
      "src/app/(main)/deadline/7days/page.tsx",
      /getDeadline7DaysContestsPayload\(12\)/,
    ],
    [
      "latest collection",
      "src/app/(main)/latest/page.tsx",
      /fetchContests\(\{\s*verified_only:\s*true,\s*limit:\s*12\s*\}\)/,
    ],
    [
      "type collection",
      "src/app/(main)/type/[type]/page.tsx",
      /fetchContests\(\{\s*type,\s*verified_only:\s*true,\s*limit:\s*12\s*\}\)/,
    ],
    [
      "field facet",
      "src/app/(main)/field/[field]/page.tsx",
      /getFieldContestsPayload\(params\.field,\s*12\)/,
    ],
    [
      "category facet",
      "src/app/(main)/categories/[category]/page.tsx",
      /getCategoryContestsPayload\(params\.category,\s*12\)/,
    ],
    [
      "target facet",
      "src/app/(main)/target/[target]/page.tsx",
      /getTargetContestsPayload\(params\.target,\s*12\)/,
    ],
    [
      "host facet",
      "src/app/(main)/host/[host]/page.tsx",
      /getHostContestsPayload\(params\.host,\s*12\)/,
    ],
  ];

  for (const [label, relativePath, pattern] of files) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
    assert.match(source, pattern, `${label} page should keep SSR contest grids capped`);
  }
});

test("public contest pages remain cacheable instead of forced dynamic", () => {
  const files = [
    "src/app/(main)/contests/page.tsx",
    "src/app/(main)/contests/[slug]/page.tsx",
    "src/app/(main)/deadline/page.tsx",
    "src/app/(main)/deadline/7days/page.tsx",
    "src/app/(main)/latest/page.tsx",
    "src/app/(main)/categories/[category]/page.tsx",
    "src/app/(main)/field/[field]/page.tsx",
    "src/app/(main)/type/[type]/page.tsx",
    "src/app/(main)/target/[target]/page.tsx",
    "src/app/(main)/host/[host]/page.tsx",
  ];

  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
    assert.match(source, /export const revalidate = 300/);
    assert.doesNotMatch(source, /force-dynamic/);
  }
});
