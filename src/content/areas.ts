import type { AreaDefinition, FishingSpotDefinition } from './types';

export const AREAS = [
  {
    id: 'village-canal',
    name: { th: 'คลองหมู่บ้าน', en: 'Village Canal' },
    chapter: 1,
    description: {
      th: 'คลองสายเล็กที่ไหลผ่านหมู่บ้าน เป็นจุดเริ่มต้นของการผจญภัยตกปลา',
      en: 'A quiet canal winding through the village, where a young angler begins their journey.',
    },
    spotIds: ['shallow-bank', 'wooden-bridge', 'lotus-bed', 'deep-pool'],
  },
] satisfies AreaDefinition[];

export const FISHING_SPOTS = [
  {
    id: 'shallow-bank',
    name: { th: 'ตลิ่งน้ำตื้น', en: 'Shallow Bank' },
    description: {
      th: 'ขอบคลองตื้นสงบ มีเงากกทอดลงบนผิวน้ำ เหมาะกับการฝึกตกปลา',
      en: 'A calm, shallow edge where reed shadows fall across the water; a gentle place to learn.',
    },
    fishIds: ['river-minnow', 'reed-perch', 'mud-carp', 'silver-barb'],
    risk: 0.12,
  },
  {
    id: 'wooden-bridge',
    name: { th: 'สะพานไม้เก่า', en: 'Wooden Bridge' },
    description: {
      th: 'ใต้สะพานไม้เก่ามีกระแสน้ำวนช้า ๆ และปลาที่ชอบหลบในเงา',
      en: 'Slow eddies gather beneath the old planks, sheltering fish that favor the shade.',
    },
    fishIds: ['silver-barb', 'bluegill', 'glass-catfish', 'lantern-catfish'],
    risk: 0.28,
  },
  {
    id: 'lotus-bed',
    name: { th: 'กอบัว', en: 'Lotus Bed' },
    description: {
      th: 'ใบบัวหนาทึบปกคลุมผิวน้ำ เป็นแหล่งอาหารของปลาหลากสี',
      en: 'Broad lotus leaves cover the surface above a lively feeding ground.',
    },
    fishIds: ['lotus-goby', 'bluegill', 'golden-carp', 'river-pike', 'moon-koi'],
    risk: 0.4,
  },
  {
    id: 'deep-pool',
    name: { th: 'แอ่งน้ำลึก', en: 'Deep Pool' },
    description: {
      th: 'แอ่งมืดใต้โค้งคลองเป็นถิ่นของพญาช่อนเงาจันทร์ ต้องปลดล็อกการล่าก่อนจึงจะเข้าได้',
      en: 'A shadowed hollow beneath the canal bend, home to the Moon Shadow Snakehead. Unlock the hunt before entering.',
    },
    fishIds: ['old-river-king'],
    unlockAfter: 'old-fisher-rumor',
    risk: 0.9,
  },
] satisfies FishingSpotDefinition[];
