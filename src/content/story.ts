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
    title: { th: 'เงาปลาใต้แสงจันทร์', en: 'A Shadow Beneath the Moon' },
    body: {
      th: 'นักตกปลาสูงวัยเล่าว่าพญาช่อนเงาจันทร์ซ่อนอยู่ใต้ผิวน้ำลึก มันจะเผยตัวเมื่อคุณพร้อม',
      en: 'A veteran angler tells of the Moon Shadow Snakehead lurking in the Deep Pool, waiting for an angler ready to read its changing intent.',
    },
    npc: { th: 'ลุงชาญ นักตกปลา', en: 'Uncle Chan, Veteran Angler' },
  },
  {
    id: 'king-hunt-unlocked',
    trigger: 'spot-unlocked',
    title: { th: 'เปิดเส้นทางสู่แอ่งลึก', en: 'The King Hunt Opens' },
    body: {
      th: 'หลังฟังคำแนะนำและเตรียมอุปกรณ์แล้ว ดาวชี้ทางไปยังแอ่งน้ำลึก ที่ซึ่งพญาช่อนเงาจันทร์รออยู่',
      en: 'With a sturdier setup and Dao’s directions, the way to the Deep Pool is open. The Moon Shadow Snakehead waits there.',
    },
    npc: { th: 'ดาว', en: 'Dao' },
  },
  {
    id: 'king-defeated',
    trigger: 'king-caught',
    title: { th: 'พญาช่อนเงาจันทร์!', en: 'Moon Shadow Snakehead!' },
    body: {
      th: 'คุณเอาชนะพญาช่อนเงาจันทร์ที่เปลี่ยนจังหวะการต่อสู้ได้สำเร็จ ชาวคลองต่างพากันยินดีกับชัยชนะครั้งนี้',
      en: 'You read and overcome the Moon Shadow Snakehead through its changing fight phases. The canal’s anglers celebrate your victory.',
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
