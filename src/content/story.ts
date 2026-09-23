import type { StoryEventDefinition } from './types';

export const STORY_EVENTS = [
  {
    id: 'chapter-opening',
    trigger: 'chapter-start',
    title: { th: 'เสียงน้ำเรียกหา', en: 'The Water Calls' },
    body: {
      th: 'ดาว ผู้ดูแลคลอง ยื่นคันเบ็ดให้และชวนคุณลองตกปลาที่คลองหมู่บ้าน',
      en: 'Dao, the canal keeper, lends you a simple rod and invites you to try your first cast at the Village Canal.',
    },
    npc: { th: 'ดาว ผู้ดูแลคลอง', en: 'Dao, Canal Keeper' },
  },
  {
    id: 'first-catch',
    trigger: 'first-catch',
    title: { th: 'ปลาตัวแรก!', en: 'A First Catch!' },
    body: {
      th: 'ปลาตัวแรกของคุณขึ้นจากน้ำแล้ว ดาวยิ้มให้ก่อนแนะนำให้ลองสำรวจจุดอื่นตามคลอง',
      en: 'Your first fish is safely in hand. Dao smiles and suggests exploring the other familiar stretches of canal.',
    },
    npc: { th: 'ดาว', en: 'Dao' },
  },
  {
    id: 'old-fisher-rumor',
    trigger: 'fish-discovered',
    title: { th: 'เรื่องเล่าของคนตกปลาเก่า', en: 'A Veteran Angler’s Rumor' },
    body: {
      th: 'นักตกปลาสูงวัยเล่าว่ามีเงาปลาตัวใหญ่ซ่อนอยู่ใต้ผิวน้ำลึก เรื่องเล่านี้ยังเป็นเพียงข่าวลือ',
      en: 'A veteran angler speaks of a huge shadow beneath the deeper water. For now, it is only a rumor.',
    },
    npc: { th: 'ลุงชาญ นักตกปลา', en: 'Uncle Chan, Veteran Angler' },
  },
  {
    id: 'king-hunt-unlocked',
    trigger: 'spot-unlocked',
    title: { th: 'เปิดเส้นทางสู่แอ่งลึก', en: 'The King Hunt Opens' },
    body: {
      th: 'หลังฟังคำแนะนำและเตรียมอุปกรณ์แล้ว ดาวชี้ทางไปยังแอ่งน้ำลึก ที่ซึ่งมีราชาปลาเฒ่ารออยู่',
      en: 'With a sturdier setup and Dao’s directions, the way to the Deep Pool is open. The Old River King waits there.',
    },
    npc: { th: 'ดาว', en: 'Dao' },
  },
  {
    id: 'king-defeated',
    trigger: 'king-caught',
    title: { th: 'ราชาแห่งคลอง!', en: 'King of the Canal!' },
    body: {
      th: 'คุณต่อสู้จนเอาชนะราชาปลาเฒ่าได้ ชาวคลองต่างพากันยินดีกับความสำเร็จของคุณ',
      en: 'After a hard-fought battle, you land the Old River King. The canal’s anglers celebrate your achievement.',
    },
    npc: { th: 'ดาว', en: 'Dao' },
  },
  {
    id: 'scout-invitation',
    trigger: 'king-caught',
    title: { th: 'คำชวนจากหน่วยสำรวจ', en: 'An Invitation from the Scout' },
    body: {
      th: 'ผู้สำรวจที่ได้ยินเรื่องชัยชนะของคุณเชิญให้ร่วมเดินทางไปกับคณะสำรวจ การผจญภัยบทต่อไปยังไม่เริ่มที่นี่',
      en: 'A scout, impressed by your victory, invites you to travel with their crew. The next adventure is not part of this chapter.',
    },
    npc: { th: 'เรน หัวหน้าหน่วยสำรวจ', en: 'Rain, Scout Leader' },
  },
] satisfies StoryEventDefinition[];
