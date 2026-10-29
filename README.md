# 🏃‍♂️ Treadmill Pro Tracker

เว็บแอพสำหรับติดตามการเดินและวิ่งบนลู่วิ่งไฟฟ้าแบบ Real-time ออกแบบเฉพาะสำหรับลู่วิ่งโมดูล FitShow (เช่น **FS-01BD59-A**) และหน้าจอ iPad รองรับความเร็ว 0-16 km/h และความชัน 0-20 ระดับ พร้อมระบบคำนวณแคลอรี่ตามความชันจริง (ACSM) และซิงก์ข้อมูลขึ้น **Neon PostgreSQL Cloud Database**

---

## 🌟 ฟีเจอร์เด่นครบทั้ง 4 เฟส

1. **Bluetooth BLE Engine (Phase 1):**
   * เชื่อมต่อตรงกับลู่ `FS-01BD59-A` ด้วย Web Bluetooth API (รองรับทั้งมาตรฐาน FTMS และ FitShow 0xFFF0)
   * หน้าจอไม่ดับขณะวิ่งด้วย Screen Wake Lock API
   * ลิ้นชักอ่านค่า Raw Hex Packet สำหรับตรวจสอบข้อมูลไบต์
2. **Scientific Dashboard & iPad UX (Phase 2):**
   * กราฟ Dual-Axis Live Telemetry (Speed Area + Incline Stairs) ลื่นไหล 60fps
   * ระบบตั้งเป้าหมายการซ้อม (Distance 3k/5k/10k, Time, Calories, Elevation)
   * ปุ่มควบคุมด่วน (Quick Touch Controls) ปรับสปีดและความชันทันทีจาก iPad
   * คำนวณไขมันบริสุทธิ์ที่ถูกเผาผลาญเป็นกรัม (Fat Oxidation)
   * โหมดจอแคบ (Split View) สำหรับเปิดคู่กับ YouTube / Netflix บน iPad
3. **Personal Trainer Workout Engine (Phase 3):**
   * 4 คอร์สฝึกมาตรฐานระดับโลก:
     * **The 12-3-30 Incline Burn** (เดินชัน 12 ความเร็ว 4.8 นาน 30 นาที)
     * **Alpine Summit 20 Peak** (ไต่เขาพีระมิดถึงความชันสูงสุดระดับ 20!)
     * **Norwegian 4x4 VO2 Max** (วิ่งเร็วสลับพักฟื้นเพื่อเพิ่มความจุปอด)
     * **Zone 2 Aerobic Power Walk**
   * ระบบสร้างโปรแกรมเอง (Custom Interval Builder)
   * โค้ชเสียงบรรยายภาษาไทย/อังกฤษ (Audio Coach) พร้อมเสียงปี๊บอิเล็กทรอนิกส์นับถอยหลัง 3, 2, 1
   * ระบบ **Auto Control** สั่งปรับสปีดและความชันของลู่วิ่งให้อัตโนมัติตามสเต็ป
4. **Neon PostgreSQL Cloud Database & Analytics (Phase 4):**
   * บันทึกประวัติการวิ่งขึ้น **Neon Serverless Postgres** แบบ Real-time
   * มีระบบสำรองข้อมูลในเครื่องอัตโนมัติ (Local Backup) วิ่งแบบออฟไลน์ได้
   * สรุปสถิติสะสม: ระยะทางรวม, ความสูงที่ปีนได้, แคลอรี่รวม, กรัมไขมันรวม
   * ปุ่มดาวน์โหลดไฟล์ **`.GPX`** เพื่อนำไปอัปโหลดเข้า **Strava** หรือ **Garmin** ได้ฟรี
   * ส่งออกประวัติทั้งหมดเป็นไฟล์ **`.CSV` (Excel)**

---

## 🚀 วิธีเปิดใช้งาน

1. รันเซิร์ฟเวอร์ Local:
   ```bash
   cd D:\Works\treadmill-tracker
   npm run dev
   ```
2. เปิดเบราว์เซอร์ไปที่:
   ```
   http://localhost:5173
   ```
3. กดปุ่ม **"เชื่อมต่อลู่"** แล้วเลือก `FS-01BD59-A` (หรือกดปุ่ม **"โหมด Demo"** เพื่อทดลองใช้งาน)

---

## 🐘 การตั้งค่า Neon PostgreSQL Database

1. สมัครฟรีที่ [neon.tech](https://neon.tech)
2. สร้างโปรเจกต์ใหม่และคัดลอก **Connection string (URI)**
3. ในเว็บแอพ กดที่ปุ่ม **"ประวัติ & สถิติ"** ด้านบน → กด **"เชื่อมต่อ Neon DB"**
4. วาง Connection string แล้วกด **"ทดสอบและบันทึก"** (ระบบจะสร้างตาราง `treadmill_workouts` ให้อัตโนมัติทันที)

---

## 📱 วิธีเปิดบน iPad

1. บน iPad ติดตั้งแอปฟรีจาก App Store ชื่อ **Bluefy - Web BLE Browser**
2. Deploy เว็บขึ้นโฮสต์ฟรี เช่น **Vercel** หรือ **GitHub Pages**
3. เปิด URL ในแอป Bluefy บน iPad เพื่อเชื่อมต่อบลูทูธและวิ่งได้เลย!
