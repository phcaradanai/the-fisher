import type { FishArchetype, FishIntentType, CheckMode, CheckModeReason, CheckOutcome, TurnCombatPhase, TurnFishingAction } from '../game/core/fishing/turn-types';
import type { LocalizedText, TimeOfDay } from '../content/types';
import type { GameNotice } from '../game/state/game-store';

export type Locale = 'th' | 'en';

type UiCopy = {
  title: string;
  chapter: string;
  chapterOne: string;
  coins: string;
  reputation: string;
  saveReady: string;
  saveUnavailable: string;
  language: string;
  sound: string;
  soundOn: string;
  soundOff: string;
  reducedMotion: string;
  navigation: string;
  fishing: string;
  collection: string;
  gear: string;
  story: string;
  chooseSpot: string;
  area: string;
  localLegend: string;
  sceneError: string;
  preparation: string;
  preparationHint: string;
  fight: string;
  turn: string;
  actionPoints: string;
  intent: string;
  distance: string;
  distanceRisk: string;
  tension: string;
  stamina: string;
  lineDurability: string;
  cast: string;
  reel: string;
  pull: string;
  release: string;
  brace: string;
  observe: string;
  actionHint: Record<TurnFishingAction, string>;
  firstEncounter: {
    castHint: string;
    turnHint: string;
    role: Record<TurnFishingAction, string>;
  };
  phase: Record<TurnCombatPhase, string>;
  bossPhase: Record<1 | 2 | 3, string>;
  intentName: Record<FishIntentType, string>;
  intentHint: Record<FishIntentType, string>;
  mode: Record<CheckMode, string>;
  automatic: string;
  modeReason: Record<CheckModeReason, string>;
  checkOutcome: Record<CheckOutcome, string>;
  lastAction: string;
  noRoll: string;
  fishResponse: string;
  checkRolls: string;
  checkTotal: string;
  difficulty: string;
  lineState: Record<'slack' | 'safe' | 'high' | 'danger' | 'critical', string>;
  fishEscaped: string;
  lineBroken: string;
  tryAgain: string;
  caught: string;
  discovery: string;
  firstCatch: string;
  record: string;
  reward: string;
  earnedReputation: string;
  sellReward: string;
  knowledgeProgress: string;
  collectionProgress: string;
  weight: string;
  length: string;
  sell: string;
  keep: string;
  setup: string;
  setupHint: string;
  buildProfile: string;
  powerBuild: string;
  controlBuild: string;
  buildStrength: string;
  buildTradeoff: string;
  noPenalty: string;
  compare: string;
  equippedNow: string;
  availableAlternatives: string;
  baitTargets: string;
  baitUnknownCount: (count: number) => string;
  unknownBaitTargets: string;
  collectionTitle: string;
  collectionDescription: string;
  discovered: string;
  undiscovered: string;
  unknownSpecimen: (number: number) => string;
  featureFish: string;
  catches: string;
  bestCatch: string;
  knowledge: string;
  knowledgeLevel: string;
  habitat: string;
  activeTime: string;
  preferredBaits: string;
  knownCounter: string;
  activeTimes: Record<TimeOfDay, string>;
  counterAdvice: Record<FishArchetype, string>;
  gearTitle: string;
  gearDescription: string;
  equipped: string;
  equip: string;
  buy: string;
  free: string;
  locked: string;
  stats: string;
  storyTitle: string;
  storyDescription: string;
  deepPool: string;
  fishProgress: string;
  kingProgress: string;
  chapterComplete: string;
  chapterCompleteBody: string;
  dismiss: string;
  notice: Record<Exclude<GameNotice, null>, string>;
  category: Record<'rod' | 'reel' | 'line' | 'hook' | 'bait', string>;
  stat: Record<'power' | 'control' | 'lineStrength' | 'reelSpeed' | 'attraction' | 'skillPower', string>;
  rarity: Record<'common' | 'uncommon' | 'rare' | 'king', string>;
};

export const UI_COPY: Record<Locale, UiCopy> = {
  en: {
    title: 'Village Canal',
    chapter: 'Chapter',
    chapterOne: 'A line in the water',
    coins: 'coins',
    reputation: 'trust',
    saveReady: 'Saved on this device',
    saveUnavailable: 'Local save unavailable',
    language: 'Language',
    sound: 'Sound',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    reducedMotion: 'Reduce motion',
    navigation: 'Village canal sections',
    fishing: 'Fishing',
    collection: 'Fish book',
    gear: 'Tackle shed',
    story: 'Local stories',
    chooseSpot: 'Choose fishing spot',
    area: 'Fishing spot',
    localLegend: 'Read the water, answer the fish, and let the line breathe.',
    sceneError: 'The canal scene could not start. Fishing controls remain available.',
    preparation: 'Rig your line',
    preparationHint: 'Choose a spot and bait. Your rod and reel shape every response.',
    fight: 'Tactical duel',
    turn: 'Turn',
    actionPoints: 'AP',
    intent: 'Fish intent',
    distance: 'Distance',
    distanceRisk: 'Escape risk',
    tension: 'Line tension',
    stamina: 'Fish stamina',
    lineDurability: 'Line durability',
    cast: 'Cast and meet the fish',
    reel: 'REEL',
    pull: 'PULL',
    release: 'RELEASE',
    brace: 'BRACE',
    observe: 'OBSERVE',
    actionHint: {
      reel: 'Gain line steadily; tension rises.',
      pull: 'Break stamina quickly; adds more tension.',
      release: 'Ease tension, but give up distance.',
      brace: 'Counter a surge and soften its response.',
      observe: 'Read intent; success records a note and sharpens your next move.',
    },
    firstEncounter: {
      castHint: 'CAST starts the first encounter. Read the fish, then choose how to answer it.',
      turnHint: '2 AP per round. The fish responds when AP is exhausted. Advantage aids a match; disadvantage warns of conflict.',
      role: {
        reel: 'Closes distance; tension rises.',
        pull: 'Drains stamina; tension rises.',
        release: 'Lowers tension; loses distance.',
        brace: 'Absorbs a rush.',
        observe: 'Reads intent.',
      },
    },
    phase: {
      ready: 'Ready at the water',
      'player-turn': 'Your turn',
      caught: 'Catch landed',
      escaped: 'Fish escaped',
      'line-break': 'Line broken',
    },
    bossPhase: { 1: 'Opening', 2: 'Frenzy', 3: 'Desperate run' },
    intentName: {
      'steady-pull': 'Steady pull',
      'power-dash': 'Power dash',
      'deep-dive': 'Deep dive',
      thrash: 'Thrash',
      recover: 'Recover',
    },
    intentHint: {
      'steady-pull': 'The fish leans into the line with measured pressure.',
      'power-dash': 'A fast run threatens distance and line tension.',
      'deep-dive': 'A low run strains the line; RELEASE can bleed pressure.',
      thrash: 'A violent shake can damage the line.',
      recover: 'The fish catches its breath; PULL or REEL gets a clear window.',
    },
    mode: { advantage: 'Advantage', normal: 'Even', disadvantage: 'Disadvantage' },
    automatic: 'No roll',
    modeReason: {
      'observed-insight': 'Your observation sharpens this response.',
      'brace-counter': 'BRACE counters the telegraphed pressure.',
      'poor-response': 'This action clashes with the fish’s intent.',
      'recovery-window': 'The fish is recovering; press the opening.',
      neutral: 'No matchup edge.',
    },
    checkOutcome: {
      'critical-failure': 'Critical miss',
      failure: 'Miss',
      'partial-success': 'Partial success',
      success: 'Success',
      'critical-success': 'Critical success',
    },
    lastAction: 'Last action',
    noRoll: 'No roll',
    fishResponse: 'Fish response',
    checkRolls: 'Rolls',
    checkTotal: 'Total',
    difficulty: 'Target',
    lineState: {
      slack: 'Slack',
      safe: 'Steady',
      high: 'Rising',
      danger: 'Danger',
      critical: 'Break risk',
    },
    fishEscaped: 'The fish slipped beyond reach.',
    lineBroken: 'The line snapped under pressure.',
    tryAgain: 'Prepare another cast',
    caught: 'Landed',
    discovery: 'Field discovery',
    firstCatch: 'First catch',
    record: 'Personal best',
    reward: 'Reward',
    earnedReputation: 'Trust earned',
    sellReward: 'Sell reward',
    knowledgeProgress: 'Knowledge',
    collectionProgress: 'Fish book',
    weight: 'Weight',
    length: 'Length',
    sell: 'Sell for',
    keep: 'Keep fish',
    setup: 'Your setup',
    setupHint: 'Control steadies the line; power drains stamina faster.',
    buildProfile: 'Build profile',
    powerBuild: 'Power-led',
    controlBuild: 'Control-led',
    buildStrength: 'Strength',
    buildTradeoff: 'Trade-off',
    noPenalty: 'No built-in penalty',
    compare: 'vs current',
    equippedNow: 'Equipped now',
    availableAlternatives: 'Available alternatives',
    baitTargets: 'This bait draws',
    baitUnknownCount: (count) => `${count} unknown target${count === 1 ? '' : 's'}`,
    unknownBaitTargets: 'No preferred catch is recorded for this bait.',
    collectionTitle: 'Fish book',
    collectionDescription: 'Observe fish in a duel to reveal habitat, bait, and counterplay.',
    discovered: 'Recorded',
    undiscovered: 'Not yet seen',
    unknownSpecimen: (number) => `Unknown specimen ${String(number).padStart(2, '0')}`,
    featureFish: 'Spotlight this fish',
    catches: 'Catches',
    bestCatch: 'Best catch',
    knowledge: 'Field notes',
    knowledgeLevel: 'Knowledge',
    habitat: 'Found at',
    activeTime: 'Most active',
    preferredBaits: 'Useful bait',
    knownCounter: 'Fight note',
    activeTimes: { morning: 'morning', day: 'day', evening: 'evening', night: 'night' },
    counterAdvice: {
      calm: 'PULL during a steady pull; use OBSERVE to time a clean opening.',
      sprinter: 'BRACE against POWER DASH. RELEASE during DEEP DIVE to lower tension.',
      diver: 'RELEASE during DEEP DIVE; use PULL only when it recovers.',
      bruiser: 'BRACE against THRASH and protect line durability.',
      trickster: 'OBSERVE first; match BRACE or RELEASE to its changing intent.',
      endurance: 'Keep tension low through recovery windows; avoid wasting stamina.',
      berserker: 'BRACE against a surge early. In the desperate phase, guard distance first.',
    },
    gearTitle: 'Tackle shed',
    gearDescription: 'Five pieces of tackle shape bait choice, combat checks, and line control.',
    equipped: 'Equipped',
    equip: 'Equip',
    buy: 'Buy',
    free: 'Starter gear',
    locked: 'Story locked',
    stats: 'Tackle effects',
    storyTitle: 'Local stories',
    storyDescription: 'Earn the canal’s trust, follow the Moon Shadow Snakehead rumor, and meet the river scout.',
    deepPool: 'Deep Pool',
    fishProgress: 'Distinct fish caught',
    kingProgress: 'Moon Shadow Snakehead',
    chapterComplete: 'The scout has arrived',
    chapterCompleteBody: 'You landed the Moon Shadow Snakehead. The river scout invites you to explore the next waterway.',
    dismiss: 'Dismiss notice',
    notice: {
      'locked-spot': 'That spot is still closed. Follow the rumor to open it.',
      'not-enough-coins': 'Not enough coins. Sell a catch to earn more.',
      'gear-locked': 'This tackle unlocks through the story.',
      'already-owned': 'You already own this tackle.',
      'no-fish': 'No fish are listed for this spot yet.',
      'not-caught': 'Finish the current duel before changing your setup or spot.',
      sold: 'Catch sold. Coins added to your purse.',
      kept: 'Catch kept. It remains in your fish book.',
    },
    category: { rod: 'Rod', reel: 'Reel', line: 'Line', hook: 'Hook', bait: 'Bait' },
    stat: {
      power: 'Power',
      control: 'Control',
      lineStrength: 'Line strength',
      reelSpeed: 'Reel speed',
      attraction: 'Attraction',
      skillPower: 'Instinct',
    },
    rarity: { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', king: 'King Fish' },
  },
  th: {
    title: 'คลองหมู่บ้าน',
    chapter: 'บทที่',
    chapterOne: 'สายแรกในสายน้ำ',
    coins: 'เหรียญ',
    reputation: 'ชื่อเสียง',
    saveReady: 'บันทึกไว้ในอุปกรณ์แล้ว',
    saveUnavailable: 'บันทึกในเครื่องไม่ได้',
    language: 'ภาษา',
    sound: 'เสียง',
    soundOn: 'เปิดเสียง',
    soundOff: 'ปิดเสียง',
    reducedMotion: 'ลดการเคลื่อนไหว',
    navigation: 'เมนูคลองหมู่บ้าน',
    fishing: 'ตกปลา',
    collection: 'สมุดปลา',
    gear: 'โรงเก็บอุปกรณ์',
    story: 'เรื่องเล่าริมคลอง',
    chooseSpot: 'เลือกจุดตกปลา',
    area: 'จุดตกปลา',
    localLegend: 'อ่านท่าทีของปลา ตอบโต้ให้ถูกจังหวะ และผ่อนสายเมื่อถึงเวลา',
    sceneError: 'ไม่สามารถเริ่มฉากคลองได้ แต่ยังใช้ปุ่มตกปลาด้านล่างได้',
    preparation: 'เตรียมสายเบ็ด',
    preparationHint: 'เลือกจุดและเหยื่อ คันเบ็ดกับรอกจะกำหนดวิธีตอบโต้ของคุณ',
    fight: 'ดวลเชิงกลยุทธ์',
    turn: 'เทิร์น',
    actionPoints: 'แต้มแอ็กชัน',
    intent: 'ท่าทีของปลา',
    distance: 'ระยะห่าง',
    distanceRisk: 'เสี่ยงหลุดหนี',
    tension: 'แรงตึงสาย',
    stamina: 'แรงของปลา',
    lineDurability: 'ความทนของสาย',
    cast: 'เหวี่ยงเบ็ดและเริ่มดวล',
    reel: 'กรอ',
    pull: 'ดึง',
    release: 'ผ่อนสาย',
    brace: 'ประคองสาย',
    observe: 'สังเกต',
    actionHint: {
      reel: 'ค่อย ๆ ดึงระยะเข้ามา แต่แรงตึงจะเพิ่มขึ้น',
      pull: 'ลดแรงของปลาได้เร็ว แต่เพิ่มแรงตึงมากกว่า',
      release: 'ลดแรงตึง แลกกับการเสียระยะ',
      brace: 'รับท่าพุ่งและลดแรงโต้กลับของปลา',
      observe: 'อ่านท่าที หากสำเร็จจะบันทึกความรู้และช่วยแอ็กชันถัดไป',
    },
    firstEncounter: {
      castHint: 'เหวี่ยงเบ็ดเพื่อเริ่มดวลครั้งแรก อ่านท่าทีปลา แล้วเลือกวิธีตอบโต้',
      turnHint: 'รอบละ 2 แต้ม ปลาโต้ตอบเมื่อแต้มหมด ได้เปรียบคือจังหวะเข้าคู่ ส่วนเสียเปรียบเตือนว่าแอ็กชันสวนทาง',
      role: {
        reel: 'ลดระยะ แต่ตึงสายเพิ่ม',
        pull: 'ลดแรงปลา แต่ตึงสายเพิ่ม',
        release: 'ลดแรงตึง แต่เสียระยะ',
        brace: 'รับแรงพุ่ง',
        observe: 'อ่านท่าที',
      },
    },
    phase: {
      ready: 'พร้อมริมคลอง',
      'player-turn': 'ตาคุณแล้ว',
      caught: 'จับปลาได้แล้ว',
      escaped: 'ปลาหลุดหนีไป',
      'line-break': 'สายเบ็ดขาด',
    },
    bossPhase: { 1: 'ช่วงเปิดเกม', 2: 'ช่วงคลั่งกลางศึก', 3: 'ช่วงเร่งหนีครั้งสุดท้าย' },
    intentName: {
      'steady-pull': 'ดึงเป็นจังหวะ',
      'power-dash': 'พุ่งเต็มแรง',
      'deep-dive': 'ดิ่งลงลึก',
      thrash: 'สะบัดรุนแรง',
      recover: 'พักแรง',
    },
    intentHint: {
      'steady-pull': 'ปลาดึงสายอย่างสม่ำเสมอ ไม่เร่งหนีมาก',
      'power-dash': 'ปลาพุ่งหนีเร็ว เสี่ยงเสียระยะและเพิ่มแรงตึง',
      'deep-dive': 'ปลาดิ่งลงลึก ผ่อนสายเพื่อลดแรงตึงได้',
      thrash: 'ปลาสะบัดรุนแรง อาจทำให้สายเสียหาย',
      recover: 'ปลากำลังพักแรง เป็นจังหวะให้ดึงหรือกรอ',
    },
    mode: { advantage: 'ได้เปรียบ', normal: 'ปกติ', disadvantage: 'เสียเปรียบ' },
    automatic: 'ไม่ทอยลูกเต๋า',
    modeReason: {
      'observed-insight': 'การสังเกตช่วยให้ตอบโต้คมขึ้น',
      'brace-counter': 'ประคองสายรับมือกับท่าที่ปลาเผยแล้ว',
      'poor-response': 'แอ็กชันนี้สวนทางกับท่าทีของปลา',
      'recovery-window': 'ปลากำลังพักแรง ใช้จังหวะนี้เข้าทำ',
      neutral: 'ไม่มีความได้เปรียบเฉพาะจังหวะ',
    },
    checkOutcome: {
      'critical-failure': 'พลาดหนัก',
      failure: 'พลาด',
      'partial-success': 'สำเร็จบางส่วน',
      success: 'สำเร็จ',
      'critical-success': 'สำเร็จยอดเยี่ยม',
    },
    lastAction: 'แอ็กชันล่าสุด',
    noRoll: 'ไม่มีการทอย',
    fishResponse: 'การตอบสนองของปลา',
    checkRolls: 'แต้มทอย',
    checkTotal: 'รวม',
    difficulty: 'เป้าหมาย',
    lineState: {
      slack: 'สายหย่อน',
      safe: 'สายยังนิ่ง',
      high: 'แรงตึงสูงขึ้น',
      danger: 'อันตราย',
      critical: 'เสี่ยงขาดทันที',
    },
    fishEscaped: 'ปลาหนีออกไปไกลเกินเอื้อม',
    lineBroken: 'สายขาดเพราะรับแรงไม่ไหว',
    tryAgain: 'เตรียมเหวี่ยงอีกครั้ง',
    caught: 'จับได้แล้ว',
    discovery: 'ค้นพบในสมุดปลา',
    firstCatch: 'จับได้เป็นครั้งแรก',
    record: 'สถิติส่วนตัว',
    reward: 'รางวัล',
    earnedReputation: 'ชื่อเสียงที่ได้รับ',
    sellReward: 'รางวัลจากการขาย',
    knowledgeProgress: 'ความรู้',
    collectionProgress: 'สมุดปลา',
    weight: 'น้ำหนัก',
    length: 'ความยาว',
    sell: 'ขายได้',
    keep: 'เก็บปลาไว้',
    setup: 'ชุดอุปกรณ์ของคุณ',
    setupHint: 'การควบคุมช่วยประคองสาย พลังช่วยลดแรงปลาได้เร็วขึ้น',
    buildProfile: 'แนวทางของชุด',
    powerBuild: 'เน้นพลัง',
    controlBuild: 'เน้นการควบคุม',
    buildStrength: 'จุดแข็ง',
    buildTradeoff: 'สิ่งที่ต้องแลก',
    noPenalty: 'ไม่มีข้อเสียจากชุดนี้',
    compare: 'เทียบกับชุดปัจจุบัน',
    equippedNow: 'ใช้อยู่ตอนนี้',
    availableAlternatives: 'ตัวเลือกอื่น',
    baitTargets: 'เหยื่อนี้ดึงดูด',
    baitUnknownCount: (count) => `เป้าหมายที่ยังไม่รู้จัก ${count} ชนิด`,
    unknownBaitTargets: 'ยังไม่มีข้อมูลปลาเป้าหมายของเหยื่อนี้',
    collectionTitle: 'สมุดปลา',
    collectionDescription: 'สังเกตปลาในระหว่างดวลเพื่อเปิดเผยถิ่นอาศัย เหยื่อ และวิธีรับมือ',
    discovered: 'บันทึกแล้ว',
    undiscovered: 'ยังไม่เคยพบ',
    unknownSpecimen: (number) => `ตัวอย่างที่ยังไม่รู้จัก ${String(number).padStart(2, '0')}`,
    featureFish: 'เปิดดูปลานี้',
    catches: 'จำนวนที่จับได้',
    bestCatch: 'ตัวใหญ่ที่สุด',
    knowledge: 'บันทึกภาคสนาม',
    knowledgeLevel: 'ระดับความรู้',
    habitat: 'พบได้ที่',
    activeTime: 'ช่วงที่พบมาก',
    preferredBaits: 'เหยื่อที่เหมาะ',
    knownCounter: 'บันทึกการต่อสู้',
    activeTimes: { morning: 'ตอนเช้า', day: 'กลางวัน', evening: 'ตอนเย็น', night: 'กลางคืน' },
    counterAdvice: {
      calm: 'ดึงเมื่อปลาดึงเป็นจังหวะ ใช้สังเกตเพื่อเลือกจังหวะเข้าทำ',
      sprinter: 'ประคองสายรับมือการพุ่งเต็มแรง ผ่อนสายเมื่อปลาดิ่งลงลึก',
      diver: 'ผ่อนสายเมื่อปลาดิ่ง และดึงเมื่อมันพักแรง',
      bruiser: 'ประคองสายรับมือการสะบัด ปกป้องความทนของสาย',
      trickster: 'สังเกตก่อน แล้วเลือกประคองหรือผ่อนสายตามท่าทีที่เปลี่ยนไป',
      endurance: 'คุมแรงตึงในจังหวะพัก อย่าใช้แรงปลาจนหมดโดยไม่จำเป็น',
      berserker: 'ประคองสายรับมือช่วงพุ่งแรง และในช่วงท้ายให้รักษาระยะเป็นหลัก',
    },
    gearTitle: 'โรงเก็บอุปกรณ์',
    gearDescription: 'อุปกรณ์ห้าชิ้นกำหนดเหยื่อ การทดสอบระหว่างดวล และการควบคุมสาย',
    equipped: 'ใช้อยู่',
    equip: 'สวมใส่',
    buy: 'ซื้อ',
    free: 'อุปกรณ์เริ่มต้น',
    locked: 'ปลดล็อกด้วยเรื่องราว',
    stats: 'ผลของอุปกรณ์',
    storyTitle: 'เรื่องเล่าริมคลอง',
    storyDescription: 'สร้างความไว้ใจ ตามรอยข่าวพญาช่อนเงาจันทร์ แล้วพบผู้สำรวจสายน้ำ',
    deepPool: 'วังน้ำลึก',
    fishProgress: 'ชนิดปลาที่จับได้',
    kingProgress: 'พญาช่อนเงาจันทร์',
    chapterComplete: 'ผู้สำรวจมาถึงแล้ว',
    chapterCompleteBody: 'คุณจับพญาช่อนเงาจันทร์ได้สำเร็จ ผู้สำรวจสายน้ำชวนคุณไปดูทางน้ำถัดไป',
    dismiss: 'ปิดข้อความ',
    notice: {
      'locked-spot': 'จุดนี้ยังเข้าไม่ได้ ตามรอยข่าวลือเพื่อเปิดทาง',
      'not-enough-coins': 'เหรียญไม่พอ ลองขายปลาที่จับได้',
      'gear-locked': 'อุปกรณ์ชิ้นนี้ปลดล็อกได้จากเรื่องราว',
      'already-owned': 'คุณมีอุปกรณ์ชิ้นนี้แล้ว',
      'no-fish': 'จุดนี้ยังไม่มีรายชื่อปลา',
      'not-caught': 'จบดวลปัจจุบันก่อนเปลี่ยนชุดอุปกรณ์หรือจุดตกปลา',
      sold: 'ขายปลาแล้ว เพิ่มเหรียญในกระเป๋า',
      kept: 'เก็บปลาไว้ในสมุดแล้ว',
    },
    category: { rod: 'คันเบ็ด', reel: 'รอก', line: 'สาย', hook: 'เบ็ด', bait: 'เหยื่อ' },
    stat: {
      power: 'พลัง',
      control: 'การควบคุม',
      lineStrength: 'ความทนสาย',
      reelSpeed: 'ความเร็วรอก',
      attraction: 'แรงดึงดูด',
      skillPower: 'สัญชาตญาณ',
    },
    rarity: { common: 'ทั่วไป', uncommon: 'ไม่ธรรมดา', rare: 'หายาก', king: 'ปลาราชา' },
  },
};

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] || text.en;
}
