const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");

function readSource(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function listSourceFiles(relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(relativePath);
    return relativePath;
  });
}

test("AdSense configuration is env-gated and ads.txt stays valid", () => {
  const adsTxt = readSource("public/ads.txt").trim();
  assert.equal(adsTxt, "google.com, pub-7242419267984081, DIRECT, f08c47fec0942fa0");

  const rootLayout = readSource("src/app/layout.tsx");
  assert.match(rootLayout, /process\.env\.NEXT_PUBLIC_ADSENSE_CLIENT/);
  assert.match(rootLayout, /google-adsense-account/);
  assert.match(rootLayout, /ADSENSE_SCRIPT_SRC &&/);
  assert.doesNotMatch(rootLayout, /ca-pub-7242419267984081/);

  const envExample = readSource(".env.local.example");
  assert.match(envExample, /NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-7242419267984081/);
  assert.match(envExample, /NEXT_PUBLIC_ADSENSE_SLOT_MAIN=/);
  assert.match(envExample, /NEXT_PUBLIC_ADSENSE_SLOT_LIST_BOTTOM=/);
  assert.match(envExample, /NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_BOTTOM=/);
});

test("AdSlot component reserves safe placeholder space when slot env is missing", () => {
  const adSlotPath = path.join(rootDir, "src/components/ads/AdSlot.tsx");
  assert.ok(fs.existsSync(adSlotPath), "AdSlot component should exist");

  const source = readSource("src/components/ads/AdSlot.tsx");
  assert.doesNotMatch(source, /ca-pub-7242419267984081/);
  assert.match(source, /NEXT_PUBLIC_ADSENSE_SLOT_MAIN/);
  assert.match(source, /NEXT_PUBLIC_ADSENSE_SLOT_LIST_BOTTOM/);
  assert.match(source, /NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_BOTTOM/);
  assert.match(source, /광고 영역/);
  assert.match(source, /min-h-/);
});

test("runtime source does not hardcode the AdSense publisher id", () => {
  const runtimeFiles = listSourceFiles("src").filter((relativePath) => /\.(ts|tsx)$/.test(relativePath));
  for (const relativePath of runtimeFiles) {
    const source = readSource(relativePath);
    assert.doesNotMatch(source, /ca-pub-7242419267984081/, `${relativePath} should read AdSense id from env`);
  }
});

test("middleware answers HEAD requests before OpenNext server rendering", () => {
  const middleware = readSource("src/middleware.ts");
  assert.match(middleware, /request\.method === "HEAD"/);
  assert.match(middleware, /new NextResponse\(null/);
  assert.match(middleware, /\/\(\(\?!_next\/static/);
});

test("public footer surfaces avoid unverified business identity claims", () => {
  const footerFiles = [
    "src/components/layout/Footer.tsx",
    "src/components/layout/TrustFooter.tsx",
  ].filter((relativePath) => fs.existsSync(path.join(rootDir, relativePath)));

  assert.ok(footerFiles.length > 0, "at least one public footer component should exist");

  for (const relativePath of footerFiles) {
    const source = readSource(relativePath);
    assert.doesNotMatch(source, /사업자번호|대표전화|통신판매업|대표이사|주소/);
  }
});

test("public shell exposes platform navigation, real briefing stats, and trust footer", () => {
  const topBriefingPath = path.join(rootDir, "src/components/layout/TopBriefingBar.tsx");
  const trustFooterPath = path.join(rootDir, "src/components/layout/TrustFooter.tsx");
  assert.ok(fs.existsSync(topBriefingPath), "TopBriefingBar component should exist");
  assert.ok(fs.existsSync(trustFooterPath), "TrustFooter component should exist");

  const layout = readSource("src/app/(main)/layout.tsx");
  assert.match(layout, /fetchContests/);
  assert.match(layout, /getTopBriefingStats/);
  assert.match(layout, /stats=\{topBriefingStats\}/);

  const header = readSource("src/components/layout/Header.tsx");
  assert.match(header, /hidden items-center gap-2 lg:flex/);
  assert.match(header, /flex items-center gap-1 lg:hidden/);
  assert.match(header, /font-black tracking-tight text-zinc-950[^"]*whitespace-nowrap/);
  assert.match(header, /text-sm font-semibold transition-colors[^"]*whitespace-nowrap/);
  for (const label of ["공고 탐색", "마감 관리", "준비 가이드", "공모전 브리핑", "커뮤니티", "북마크"]) {
    assert.match(header, new RegExp(label));
  }
  for (const label of ["공모전", "대외활동", "인턴십", "공고 검색"]) {
    assert.match(header, new RegExp(label));
  }

  const topBriefing = readSource("src/components/layout/TopBriefingBar.tsx");
  assert.match(topBriefing, /max-w-full/);
  for (const token of ["TopBriefingStats", "stats.totalCount", "stats.endingTodayCount", "stats.endingThisWeekCount", "stats.highPrizeCount", "stats.newCount"]) {
    assert.match(topBriefing, new RegExp(token.replace(".", "\\.")));
  }
  for (const label of ["오늘 마감", "이번 주 마감", "상금 높은 공모전", "새로 등록된 공모전"]) {
    assert.match(topBriefing, new RegExp(label));
  }

  const trustFooter = readSource("src/components/layout/TrustFooter.tsx");
  for (const label of ["info@gongmozip.com", "정보 수정", "공고 등록", "광고/제휴", "공식 출처"]) {
    assert.match(trustFooter, new RegExp(label));
  }
});

test("home page wires platform sections and local editorial data", () => {
  const requiredFiles = [
    "src/components/home/MainHero.tsx",
    "src/components/home/QuickExploreCards.tsx",
    "src/components/home/HomeSearchBand.tsx",
    "src/components/home/LivePlatformSection.tsx",
    "src/components/home/ContestTableSection.tsx",
    "src/components/home/BriefingSection.tsx",
    "src/components/home/BestStorySection.tsx",
    "src/components/home/NewsletterSection.tsx",
    "src/data/briefing.ts",
    "src/data/community-stories.ts",
  ];

  for (const relativePath of requiredFiles) {
    assert.ok(fs.existsSync(path.join(rootDir, relativePath)), `${relativePath} should exist`);
  }

  const homePage = readSource("src/app/(main)/page.tsx");
  const renderedHome = homePage.slice(homePage.indexOf("return ("));
  const orderedTokens = [
    "MainHero",
    "LivePlatformSection",
    "QuickExploreCards",
    "HomeSearchBand",
    "AnalysisCurationSection",
    "ContestTableSection",
    "BriefingSection",
    "BestStorySection",
    "NewsletterSection",
    "AdSlot",
  ];
  let previousIndex = -1;
  for (const token of orderedTokens) {
    const index = renderedHome.indexOf(token);
    assert.notEqual(index, -1, `${token} should be rendered on home`);
    assert.ok(index > previousIndex, `${token} should appear after the previous home section`);
    previousIndex = index;
  }

  const homeSearch = readSource("src/components/home/HomeSearchBand.tsx");
  assert.match(homeSearch, /name="q"/);
  assert.doesNotMatch(homeSearch, /name="search"/);

  const mainHero = readSource("src/components/home/MainHero.tsx");
  assert.match(mainHero, /grid gap-2 sm:flex sm:flex-wrap/);
  assert.match(mainHero, /hidden sm:inline-flex btn-primary sm:w-auto/);
  assert.match(mainHero, /btn-secondary w-full sm:w-auto/);

  const quickExplore = readSource("src/components/home/QuickExploreCards.tsx");
  assert.match(quickExplore, /\/contests\?q=상금&sort=recommended/);

  const livePlatform = readSource("src/components/home/LivePlatformSection.tsx");
  assert.match(livePlatform, /이 공고 어때요\?/);
  assert.match(livePlatform, /지원 질문 Live/);
  assert.match(livePlatform, /새로 올라온 공고/);
  assert.match(livePlatform, /공고 등록 문의/);

  const contestTable = readSource("src/components/home/ContestTableSection.tsx");
  assert.match(contestTable, /min-w-0 rounded-lg border/);
  assert.match(contestTable, /break-words/);

  const newsletter = readSource("src/components/home/NewsletterSection.tsx");
  assert.match(newsletter, /개인정보 수집 및 이용 동의/);
  assert.match(newsletter, /광고성 정보 수신 동의/);
  assert.doesNotMatch(newsletter, /console\.(log|info|warn|error)/);
});

test("contest listing uses poster fallback and bottom ad slot", () => {
  const contestCard = readSource("src/components/contest/ContestCard.tsx");
  assert.match(contestCard, /FallbackImage/);
  assert.doesNotMatch(contestCard, /from "next\/image"/);

  const listingClient = readSource("src/components/contest/ContestsPageClient.tsx");
  assert.match(listingClient, /AdSlot/);
  assert.match(listingClient, /placement="listBottom"/);
});

test("contest detail uses poster fallback, share button, and bottom ad slot", () => {
  const shareButtonPath = path.join(rootDir, "src/components/contest/detail/ShareContestButton.tsx");
  assert.ok(fs.existsSync(shareButtonPath), "ShareContestButton component should exist");

  const hero = readSource("src/components/contest/detail/ContestDecisionHero.tsx");
  assert.match(hero, /FallbackImage/);
  assert.match(hero, /ShareContestButton/);
  assert.doesNotMatch(hero, /from "next\/image"/);

  const shareButton = readSource("src/components/contest/detail/ShareContestButton.tsx");
  assert.match(shareButton, /공유/);
  assert.match(shareButton, /navigator\.share|navigator\.clipboard/);

  const detailPage = readSource("src/app/(main)/contests/[slug]/page.tsx");
  assert.match(detailPage, /AdSlot/);
  assert.match(detailPage, /placement="detailBottom"/);
});

test("SEO and contact surfaces describe decision support with domain email", () => {
  const rootLayout = readSource("src/app/layout.tsx");
  assert.match(rootLayout, /일정, 혜택, 지원 조건, 준비 난이도/);

  const contactPage = readSource("src/app/(main)/contact/page.tsx");
  assert.match(contactPage, /info@gongmozip\.com/);
  assert.match(contactPage, /mailto:info@gongmozip\.com/);
  assert.match(contactPage, /공고 등록/);
  assert.match(contactPage, /광고·제휴/);
});
