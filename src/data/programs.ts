import type { WorkoutProgram } from '../types/workout';

export const WORKOUT_PROGRAMS: WorkoutProgram[] = [
  {
    id: 'prog_12_3_30',
    title: 'The 12-3-30 Incline Burn',
    subtitle: 'สูตรยอดนิยมระดับโลก เผาผลาญไขมันสูงสุดแบบ Low-Impact',
    category: 'fat_burn',
    difficulty: 'Intermediate',
    badge: '🔥 HOT',
    targetZone: 'Zone 2 Fat Oxidation',
    description: 'โปรแกรมเดินชันระดับตำนาน 30 นาทีเต็มบนความชันระดับ 12 ความเร็ว 4.8 กม./ชม. ช่วยลดแรงกระแทกเข่าแต่เผาผลาญพลังงานเทียบเท่าการวิ่ง',
    totalDurationSeconds: 35 * 60,
    steps: [
      {
        id: 's1',
        name: 'วอร์มอัป (Warm-up)',
        durationSeconds: 3 * 60,
        targetSpeed: 3.8,
        targetIncline: 3,
        type: 'warmup',
        instructions: 'ปรับจังหวะการหายใจ แกว่งแขนอย่างเป็นธรรมชาติ'
      },
      {
        id: 's2',
        name: '12-3-30 Main Burn',
        durationSeconds: 30 * 60,
        targetSpeed: 4.8,
        targetIncline: 12,
        type: 'work',
        instructions: 'ก้าวเท้ายาวๆ ลงน้ำหนักเต็มฝ่าเท้า ดันสะโพกไปข้างหน้า ไม่จับราวจับ'
      },
      {
        id: 's3',
        name: 'คูลดาวน์ (Cool-down)',
        durationSeconds: 2 * 60,
        targetSpeed: 3.2,
        targetIncline: 1,
        type: 'cooldown',
        instructions: 'ผ่อนคลายกล้ามเนื้อ หายใจเข้าลึกๆ'
      }
    ]
  },
  {
    id: 'prog_alpine_summit_20',
    title: 'Alpine Summit 20 (พีระมิดไต่เขา)',
    subtitle: 'ทดสอบพลังสะโพกและน่อง ด้วยความชันสูงสุดระดับ 20',
    category: 'climb',
    difficulty: 'Advanced',
    badge: '⛰️ SUMMIT 20',
    targetZone: 'Glute & Calves Endurance',
    description: 'โปรแกรมที่ดึงประสิทธิภาพสูงสุดของลู่วิ่งความชัน 20 ระดับของคุณ ไต่ระดับความชันทีละขั้นจนถึงยอดเขา 20 ระดับ แล้วค่อยๆ เดินลง',
    totalDurationSeconds: 32 * 60,
    steps: [
      { id: 'as1', name: 'เริ่มไต่ระดับ 1', durationSeconds: 4 * 60, targetSpeed: 4.5, targetIncline: 4, type: 'warmup' },
      { id: 'as2', name: 'ไต่ระดับ 2 (ชัน 8)', durationSeconds: 4 * 60, targetSpeed: 4.5, targetIncline: 8, type: 'work' },
      { id: 'as3', name: 'ไต่ระดับ 3 (ชัน 12)', durationSeconds: 4 * 60, targetSpeed: 4.2, targetIncline: 12, type: 'work' },
      { id: 'as4', name: 'ไต่ระดับ 4 (ชัน 16)', durationSeconds: 4 * 60, targetSpeed: 4.0, targetIncline: 16, type: 'work' },
      { id: 'as5', name: '🏔️ จุดสูงสุด Summit (ชัน 20)', durationSeconds: 4 * 60, targetSpeed: 3.8, targetIncline: 20, type: 'work', instructions: 'ชันสูงสุดระดับ 20! โน้มตัวไปข้างหน้าเล็กน้อย ใช้พลังสะโพกเต็มที่' },
      { id: 'as6', name: 'เดินลงทางลาด (ชัน 14)', durationSeconds: 4 * 60, targetSpeed: 4.2, targetIncline: 14, type: 'work' },
      { id: 'as7', name: 'เดินลงทางลาด (ชัน 8)', durationSeconds: 4 * 60, targetSpeed: 4.5, targetIncline: 8, type: 'work' },
      { id: 'as8', name: 'กลับสู่ทางราบ คูลดาวน์', durationSeconds: 4 * 60, targetSpeed: 3.5, targetIncline: 1, type: 'cooldown' }
    ]
  },
  {
    id: 'prog_norwegian_4x4',
    title: 'Norwegian 4x4 (VO2 Max Protocol)',
    subtitle: 'มาตรฐานระดับโลกในการเพิ่มความฟิตของปอดและหัวใจ',
    category: 'hiit',
    difficulty: 'Advanced',
    badge: '🫀 VO2 MAX',
    targetZone: 'Cardiorespiratory Threshold',
    description: 'การฝึก 4 นาทีที่ความเร็วสูงสลับกับ 3 นาทีพักฟื้น 4 รอบ ช่วยเพิ่มประสิทธิภาพการใช้ออกซิเจนของกล้ามเนื้อได้เร็วที่สุดตามงานวิจัยทางการแพทย์',
    totalDurationSeconds: 33 * 60,
    steps: [
      { id: 'n_w', name: 'วอร์มอัปปรับรอบขา', durationSeconds: 5 * 60, targetSpeed: 6.0, targetIncline: 2, type: 'warmup' },
      
      { id: 'n_1', name: 'Interval 1 (วิ่งเร็ว)', durationSeconds: 4 * 60, targetSpeed: 10.5, targetIncline: 2, type: 'work' },
      { id: 'n_r1', name: 'พักฟื้น Active Recovery 1', durationSeconds: 3 * 60, targetSpeed: 5.0, targetIncline: 0, type: 'rest' },

      { id: 'n_2', name: 'Interval 2 (วิ่งเร็ว)', durationSeconds: 4 * 60, targetSpeed: 11.0, targetIncline: 2, type: 'work' },
      { id: 'n_r2', name: 'พักฟื้น Active Recovery 2', durationSeconds: 3 * 60, targetSpeed: 5.0, targetIncline: 0, type: 'rest' },

      { id: 'n_3', name: 'Interval 3 (วิ่งเร็ว)', durationSeconds: 4 * 60, targetSpeed: 11.5, targetIncline: 2, type: 'work' },
      { id: 'n_r3', name: 'พักฟื้น Active Recovery 3', durationSeconds: 3 * 60, targetSpeed: 5.0, targetIncline: 0, type: 'rest' },

      { id: 'n_4', name: 'Interval 4 (สปรินต์รอบสุดท้าย)', durationSeconds: 4 * 60, targetSpeed: 12.0, targetIncline: 2, type: 'work', instructions: 'รอบสุดท้ายแล้ว เร่งความเร็วเต็มกำลัง!' },
      
      { id: 'n_c', name: 'คูลดาวน์ คืนความสดชื่น', durationSeconds: 3 * 60, targetSpeed: 4.5, targetIncline: 0, type: 'cooldown' }
    ]
  },
  {
    id: 'prog_zone2_endurance',
    title: 'Zone 2 Aerobic Power Walk',
    subtitle: 'สร้างระบบการเผาผลาญพื้นฐาน ไม่เหนื่อยล้าสะสม',
    category: 'endurance',
    difficulty: 'Beginner',
    badge: '🌱 RECOVERY',
    targetZone: 'Pure Aerobic Base',
    description: 'เหมาะสำหรับวันสบายๆ หรือคนที่ต้องการเดินออกกำลังกายต่อเนื่อง 30 นาที สามารถดูซีรีส์หรือฟังพอดแคสต์ไปด้วยได้อย่างเพลิดเพลิน',
    totalDurationSeconds: 30 * 60,
    steps: [
      { id: 'z_1', name: 'วอร์มอัปสบายๆ', durationSeconds: 3 * 60, targetSpeed: 4.0, targetIncline: 2, type: 'warmup' },
      { id: 'z_2', name: 'Power Walk Steady 1', durationSeconds: 12 * 60, targetSpeed: 5.0, targetIncline: 6, type: 'work' },
      { id: 'z_3', name: 'Power Walk Steady 2', durationSeconds: 12 * 60, targetSpeed: 5.2, targetIncline: 8, type: 'work' },
      { id: 'z_4', name: 'คูลดาวน์ผ่อนคลาย', durationSeconds: 3 * 60, targetSpeed: 3.5, targetIncline: 1, type: 'cooldown' }
    ]
  }
];
