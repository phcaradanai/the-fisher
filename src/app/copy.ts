import type { FishingPhase } from '../game/core/fishing/types';
import type { LocalizedText } from '../content/types';
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
  tension: string;
  stamina: string;
  safe: string;
  watch: string;
  critical: string;
  cast: string;
  watchFloat: string;
  hook: string;
  reel: string;
  pull: string;
  release: string;
  skill: string;
  skillReady: string;
  cooldown: string;
  fishEscaped: string;
  lineBroken: string;
  tryAgain: string;
  caught: string;
  weight: string;
  length: string;
  sell: string;
  keep: string;
  collectionTitle: string;
  collectionDescription: string;
  discovered: string;
  undiscovered: string;
  catches: string;
  bestCatch: string;
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
  phase: Record<FishingPhase, string>;
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
    localLegend: 'Uncle Chan says a huge shadow turns beneath the far reeds.',
    sceneError: 'The canal scene could not start. Fishing controls remain available.',
    tension: 'Line tension',
    stamina: 'Fish stamina',
    safe: 'Line steady',
    watch: 'Ease the pull',
    critical: 'Line close to breaking',
    cast: 'Cast line',
    watchFloat: 'Watch the float',
    hook: 'Set the hook',
    reel: 'Reel',
    pull: 'Pull',
    release: 'Release',
    skill: 'Special move',
    skillReady: 'Ready',
    cooldown: 'Cooling down',
    fishEscaped: 'The fish slipped away.',
    lineBroken: 'The line snapped.',
    tryAgain: 'Cast again',
    caught: 'Landed',
    weight: 'Weight',
    length: 'Length',
    sell: 'Sell for',
    keep: 'Keep fish',
    collectionTitle: 'Fish book',
    collectionDescription: 'Every new catch adds its shape and story to the book.',
    discovered: 'Recorded',
    undiscovered: 'Not yet seen',
    catches: 'Catches',
    bestCatch: 'Best catch',
    gearTitle: 'Tackle shed',
    gearDescription: 'Five pieces of tackle shape every cast and fight.',
    equipped: 'Equipped',
    equip: 'Equip',
    buy: 'Buy',
    free: 'Starter gear',
    locked: 'Story locked',
    stats: 'Tackle effects',
    storyTitle: 'Local stories',
    storyDescription: 'Earn the canal’s trust, follow the King Fish rumor, and meet the river scout.',
    deepPool: 'Deep Pool',
    fishProgress: 'Distinct fish recorded',
    kingProgress: 'King Fish',
    chapterComplete: 'The scout has arrived',
    chapterCompleteBody: 'You landed the canal’s King Fish. The river scout invites you to explore the next waterway.',
    dismiss: 'Dismiss notice',
    notice: {
      'locked-spot': 'That spot is still closed. Follow the rumor to open it.',
      'not-enough-coins': 'Not enough coins. Sell a catch to earn more.',
      'gear-locked': 'This tackle unlocks through the story.',
      'already-owned': 'You already own this tackle.',
      'no-fish': 'No fish are listed for this spot yet.',
      'not-caught': 'Finish the current encounter before changing spots or casting.',
      sold: 'Catch sold. Coins added to your purse.',
      kept: 'Catch kept. It remains in your fish book.',
    },
    phase: {
      ready: 'Ready to cast',
      casting: 'Line in the air',
      waiting: 'Waiting for a bite',
      bite: 'Bite! Set the hook now',
      fighting: 'Fish on the line',
      caught: 'Catch landed',
      escaped: 'Fish escaped',
      'line-break': 'Line broken',
    },
    category: { rod: 'Rod', reel: 'Reel', line: 'Line', hook: 'Hook', bait: 'Bait' },
    stat: {
      power: 'Power',
      control: 'Control',
      lineStrength: 'Line strength',
      reelSpeed: 'Reel speed',
      attraction: 'Attraction',
      skillPower: 'Skill power',
    },
    rarity: { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', king: 'King Fish' },
  },
  th: {
    title: 'คลองหมู่บ้าน',
    chapter: 'บทที่',
    chapterOne: 'สายแรกในสายน้ำ',
    coins: 'เหรียญ',
    reputation: 'ความไว้ใจ',
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
    localLegend: 'ลุงชาญเล่าว่ามีเงาปลาตัวใหญ่พลิกน้ำอยู่ใต้กออ้อฝั่งโน้น',
    sceneError: 'ไม่สามารถเริ่มฉากคลองได้ แต่ยังใช้ปุ่มตกปลาด้านล่างได้',
    tension: 'แรงตึงสาย',
    stamina: 'แรงของปลา',
    safe: 'สายยังนิ่ง',
    watch: 'ผ่อนแรงดึง',
    critical: 'สายใกล้ขาด',
    cast: 'เหวี่ยงเบ็ด',
    watchFloat: 'จับตาดูทุ่น',
    hook: 'วัดเบ็ด',
    reel: 'กรอ',
    pull: 'ดึง',
    release: 'ผ่อนสาย',
    skill: 'ท่าพิเศษ',
    skillReady: 'พร้อมใช้',
    cooldown: 'กำลังพักท่า',
    fishEscaped: 'ปลาหลุดหนีไปแล้ว',
    lineBroken: 'สายเบ็ดขาด',
    tryAgain: 'เหวี่ยงอีกครั้ง',
    caught: 'จับได้แล้ว',
    weight: 'น้ำหนัก',
    length: 'ความยาว',
    sell: 'ขายได้',
    keep: 'เก็บปลาไว้',
    collectionTitle: 'สมุดปลา',
    collectionDescription: 'ปลาใหม่ทุกตัวจะเติมรูปร่างและเรื่องราวลงในสมุด',
    discovered: 'บันทึกแล้ว',
    undiscovered: 'ยังไม่เคยพบ',
    catches: 'จำนวนที่จับได้',
    bestCatch: 'ตัวใหญ่ที่สุด',
    gearTitle: 'โรงเก็บอุปกรณ์',
    gearDescription: 'อุปกรณ์ห้าชิ้นมีผลต่อการเหวี่ยงและการสู้กับปลา',
    equipped: 'ใช้อยู่',
    equip: 'สวมใส่',
    buy: 'ซื้อ',
    free: 'อุปกรณ์เริ่มต้น',
    locked: 'ปลดล็อกด้วยเรื่องราว',
    stats: 'ผลของอุปกรณ์',
    storyTitle: 'เรื่องเล่าริมคลอง',
    storyDescription: 'สร้างความไว้ใจ ตามรอยข่าวปลาราชา แล้วพบผู้สำรวจสายน้ำ',
    deepPool: 'วังน้ำลึก',
    fishProgress: 'ชนิดปลาที่บันทึกแล้ว',
    kingProgress: 'ปลาราชา',
    chapterComplete: 'ผู้สำรวจมาถึงแล้ว',
    chapterCompleteBody: 'คุณจับปลาราชาแห่งคลองได้สำเร็จ ผู้สำรวจสายน้ำชวนคุณไปดูทางน้ำถัดไป',
    dismiss: 'ปิดข้อความ',
    notice: {
      'locked-spot': 'จุดนี้ยังเข้าไม่ได้ ตามรอยข่าวลือเพื่อเปิดทาง',
      'not-enough-coins': 'เหรียญไม่พอ ลองขายปลาที่จับได้',
      'gear-locked': 'อุปกรณ์ชิ้นนี้ปลดล็อกได้จากเรื่องราว',
      'already-owned': 'คุณมีอุปกรณ์ชิ้นนี้แล้ว',
      'no-fish': 'จุดนี้ยังไม่มีรายชื่อปลา',
      'not-caught': 'จัดการปลาตัวนี้ก่อนเปลี่ยนจุดหรือตกซ้ำ',
      sold: 'ขายปลาแล้ว เพิ่มเหรียญในกระเป๋า',
      kept: 'เก็บปลาไว้ในสมุดแล้ว',
    },
    phase: {
      ready: 'พร้อมเหวี่ยงเบ็ด',
      casting: 'เบ็ดกำลังลอยไป',
      waiting: 'กำลังรอปลากินเบ็ด',
      bite: 'ปลากินแล้ว วัดเบ็ดเลย',
      fighting: 'กำลังสู้กับปลา',
      caught: 'จับปลาได้แล้ว',
      escaped: 'ปลาหลุดหนีไป',
      'line-break': 'สายเบ็ดขาด',
    },
    category: { rod: 'คันเบ็ด', reel: 'รอก', line: 'สาย', hook: 'เบ็ด', bait: 'เหยื่อ' },
    stat: {
      power: 'พลัง',
      control: 'การควบคุม',
      lineStrength: 'ความทนสาย',
      reelSpeed: 'ความเร็วรอก',
      attraction: 'แรงดึงดูด',
      skillPower: 'พลังท่าพิเศษ',
    },
    rarity: { common: 'ทั่วไป', uncommon: 'ไม่ธรรมดา', rare: 'หายาก', king: 'ปลาราชา' },
  },
};

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] || text.en;
}
