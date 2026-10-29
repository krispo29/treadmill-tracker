import type { BluetoothProtocol, ConnectionStatus, PacketLog, TelemetryPoint, TreadmillMetrics } from '../types/treadmill';
import { calculateAcsmCaloriesPerSecond, calculateFatGramsBurned } from './calculations';

// Standard FTMS Service & Characteristics (128-bit lowercase standard UUIDs for 100% iOS/Bluefy compatibility)
export const UUID_FTMS_SERVICE = '00001826-0000-1000-8000-00805f9b34fb';
export const UUID_FTMS_TREADMILL_DATA = '00002acd-0000-1000-8000-00805f9b34fb';
export const UUID_FTMS_CONTROL_POINT = '00002ada-0000-1000-8000-00805f9b34fb';

// Proprietary FitShow UUIDs (0xFFF0)
export const UUID_FITSHOW_SERVICE_128 = '0000fff0-0000-1000-8000-00805f9b34fb';
export const UUID_FITSHOW_NOTIFY = '0000fff1-0000-1000-8000-00805f9b34fb';
export const UUID_FITSHOW_WRITE = '0000fff2-0000-1000-8000-00805f9b34fb';

// Clean list of optional services (valid 128-bit strings only, avoids iOS CBUUID parser crash)
export const CLEAN_OPTIONAL_SERVICES = [
  UUID_FTMS_SERVICE,
  UUID_FITSHOW_SERVICE_128,
  '0000180d-0000-1000-8000-00805f9b34fb', // Heart Rate Service
];

type DataCallback = (metrics: TreadmillMetrics) => void;
type StatusCallback = (status: ConnectionStatus, protocol: BluetoothProtocol, deviceName?: string) => void;
type LogCallback = (log: PacketLog) => void;
type TelemetryCallback = (point: TelemetryPoint) => void;

class TreadmillBluetoothService {
  private device: any = null;
  private server: any = null;
  private treadmillDataChar: any = null;
  public controlChar: any = null;
  private wakeLock: any = null;

  private status: ConnectionStatus = 'disconnected';
  private protocol: BluetoothProtocol = 'Unknown';
  private deviceName: string = '';

  private onDataCallback: DataCallback | null = null;
  private onStatusCallback: StatusCallback | null = null;
  private onLogCallback: LogCallback | null = null;
  private onTelemetryCallback: TelemetryCallback | null = null;

  // Internal metrics accumulation
  private metrics: TreadmillMetrics = {
    speedKmh: 0,
    inclineLevel: 0,
    distanceMeters: 0,
    elapsedSeconds: 0,
    caloriesBurned: 0,
    elevationGainMeters: 0,
    currentPaceSecPerKm: 0,
    fatGramsBurned: 0,
  };

  private timerInterval: any = null;
  private simulationInterval: any = null;
  private userWeightKg: number = 70;

  constructor() {
    this.startMetricsTimer();
  }

  public setCallbacks(
    onData: DataCallback,
    onStatus: StatusCallback,
    onLog: LogCallback,
    onTelemetry?: TelemetryCallback
  ) {
    this.onDataCallback = onData;
    this.onStatusCallback = onStatus;
    this.onLogCallback = onLog;
    if (onTelemetry) this.onTelemetryCallback = onTelemetry;
  }

  public setUserWeight(weight: number) {
    this.userWeightKg = weight;
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public async connect(): Promise<void> {
    if (this.simulationInterval) {
      this.stopSimulation();
    }

    if (!this.isSupported()) {
      this.updateStatus('error', 'Unknown');
      this.addLog('SYS', 'Unknown', '', 'Web Bluetooth ไม่รองรับบนเบราว์เซอร์นี้ (แนะนำให้ใช้ Chrome/Edge หรือเปิดผ่าน Bluefy บน iPad)');
      throw new Error('Web Bluetooth is not supported on this browser.');
    }

    try {
      this.updateStatus('searching', 'Unknown');
      this.addLog('SYS', 'Unknown', '', 'กำลังสแกนหาอุปกรณ์ลู่วิ่ง...');

      // Detect iOS / Bluefy
      const isIOS = typeof navigator !== 'undefined' && (
        /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
        /Bluefy/i.test(navigator.userAgent)
      );

      if (isIOS) {
        // Bluefy/iOS: Use acceptAllDevices directly to avoid CoreBluetooth filter parsing exception
        this.addLog('SYS', 'Unknown', '', 'ตรวจพบ iPad/Bluefy: กำลังเปิดหน้าต่างเลือกอุปกรณ์บลูทูธ...');
        this.device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: CLEAN_OPTIONAL_SERVICES
        });
      } else {
        // Desktop / Android: Try name filters first, fallback to acceptAllDevices
        try {
          this.device = await (navigator as any).bluetooth.requestDevice({
            filters: [
              { namePrefix: 'FS' },
              { namePrefix: 'FitShow' }
            ],
            optionalServices: CLEAN_OPTIONAL_SERVICES
          });
        } catch (filterErr: any) {
          const errMsg = String(filterErr?.message || filterErr || '');
          if (errMsg.toLowerCase().includes('cancel') || errMsg.toLowerCase().includes('cancelled')) {
            throw filterErr;
          }
          this.addLog('SYS', 'Unknown', '', 'สลับไปค้นหาแบบเปิดรับทุกอุปกรณ์...');
          this.device = await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: CLEAN_OPTIONAL_SERVICES
          });
        }
      }

      this.deviceName = this.device.name || 'FitShow Treadmill';
      this.addLog('SYS', 'Unknown', '', `พบอุปกรณ์: ${this.deviceName} กำลังเชื่อมต่อ...`);
      this.updateStatus('connecting', 'Unknown', this.deviceName);

      // Listen to disconnect events
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));

      // Connect GATT Server
      this.server = await this.device.gatt.connect();
      this.addLog('SYS', 'Unknown', '', 'เชื่อมต่อ GATT สำเร็จ กำลังตรวจหา Service...');

      // Request Screen Wake Lock so screen doesn't turn off
      await this.requestWakeLock();

      // Try discovering standard FTMS first
      let serviceConnected = false;
      try {
        const ftmsService = await this.server.getPrimaryService(UUID_FTMS_SERVICE);
        this.protocol = 'FTMS';
        this.addLog('SYS', 'FTMS', '', 'พบมาตรฐาน FTMS (0x1826)');

        this.treadmillDataChar = await ftmsService.getCharacteristic(UUID_FTMS_TREADMILL_DATA);
        await this.treadmillDataChar.startNotifications();
        this.treadmillDataChar.addEventListener('characteristicvaluechanged', (e: any) => {
          this.parseFTMSPacket(e.target.value);
        });

        // Try getting control point
        try {
          this.controlChar = await ftmsService.getCharacteristic(UUID_FTMS_CONTROL_POINT);
          this.addLog('SYS', 'FTMS', '', 'พบ Control Point สำหรับส่งคำสั่งสปีด/ความชัน');
        } catch {
          // Write characteristic is optional for read-only tracking
        }

        serviceConnected = true;
      } catch (err: any) {
        this.addLog('SYS', 'Unknown', '', `ไม่พบ FTMS กำลังลอง FitShow Service (0xFFF0)...: ${err.message}`);
      }

      // If FTMS not found, try FitShow Proprietary (0xFFF0)
      if (!serviceConnected) {
        try {
          const fitshowService = await this.server.getPrimaryService(UUID_FITSHOW_SERVICE_128);
          this.protocol = 'FitShow_FFF0';
          this.addLog('SYS', 'FitShow_FFF0', '', 'พบ FitShow Proprietary Service (0xFFF0)');

          const notifyChar = await fitshowService.getCharacteristic(UUID_FITSHOW_NOTIFY);
          await notifyChar.startNotifications();
          notifyChar.addEventListener('characteristicvaluechanged', (e: any) => {
            this.parseFitShowPacket(e.target.value);
          });

          try {
            this.controlChar = await fitshowService.getCharacteristic(UUID_FITSHOW_WRITE);
            this.addLog('SYS', 'FitShow_FFF0', '', 'พบ Characteristic 0xFFF2 สำหรับส่งคำสั่ง');
          } catch {
            // Write characteristic is optional
          }

          serviceConnected = true;
        } catch (err: any) {
          this.addLog('SYS', 'Unknown', '', `ไม่พบ 0xFFF0: ${err.message}`);
        }
      }

      if (!serviceConnected) {
        throw new Error('ไม่พบ Fitness Service ที่รองรับบนอุปกรณ์นี้');
      }

      this.updateStatus('connected', this.protocol, this.deviceName);
      this.addLog('SYS', this.protocol, '', `เชื่อมต่อสำเร็จพร้อมใช้งานในโหมด ${this.protocol}!`);

    } catch (error: any) {
      console.error('Bluetooth connection error:', error);
      const rawError = String(error?.message || error || '');
      this.updateStatus('error', 'Unknown');
      this.releaseWakeLock();

      let friendlyError = `ข้อผิดพลาด: ${rawError}`;
      if (rawError === '2' || rawError.includes('denied') || rawError.includes('unauthorized')) {
        friendlyError = 'iPad ยังไม่อนุญาตบลูทูธให้แอป Bluefy (Error 2): โปรดไปที่ การตั้งค่า iPad > Bluefy > เปิดสวิตช์ Bluetooth';
      } else if (rawError.toLowerCase().includes('cancel') || rawError.toLowerCase().includes('cancelled')) {
        friendlyError = 'ยกเลิกการเลือกอุปกรณ์บลูทูธ';
      }

      this.addLog('SYS', 'Unknown', '', friendlyError);
      throw new Error(friendlyError);
    }
  }

  /**
   * Send speed command to treadmill (0.0 to 16.0 km/h)
   */
  public async setSpeed(speedKmh: number): Promise<boolean> {
    const clamped = Math.min(Math.max(Number(speedKmh.toFixed(1)), 0), 16.0);

    if (this.protocol === 'Simulation') {
      this.metrics.speedKmh = clamped;
      this.addLog('TX', 'Simulation', '', `จำลองปรับความเร็วเป็น ${clamped} km/h`);
      if (this.onDataCallback) this.onDataCallback({ ...this.metrics });
      return true;
    }

    if (!this.controlChar) {
      this.addLog('SYS', this.protocol, '', 'ลู่วิ่งไม่อนุญาตให้ส่งคำสั่งควบคุม (โหมดอ่านอย่างเดียว)');
      return false;
    }

    try {
      if (this.protocol === 'FTMS') {
        // FTMS Set Target Speed: Opcode 0x02, uint16 speed in 0.01 km/h
        const rawSpeed = Math.round(clamped * 100);
        const buffer = new Uint8Array([0x02, rawSpeed & 0xff, (rawSpeed >> 8) & 0xff]);
        await this.controlChar.writeValue(buffer);
        this.addLog('TX', 'FTMS', this.buf2hex(buffer.buffer), `ส่งคำสั่งสปีด: ${clamped} km/h`);
        return true;
      } else if (this.protocol === 'FitShow_FFF0') {
        // FitShow Speed Frame: 0x02 0x53 0x02 <speed*10> <checksum> 0x03
        const rawSpeed = Math.round(clamped * 10);
        const checksum = (0x02 ^ 0x53 ^ 0x02 ^ rawSpeed) & 0xff;
        const buffer = new Uint8Array([0x02, 0x53, 0x02, rawSpeed, checksum, 0x03]);
        await this.controlChar.writeValue(buffer);
        this.addLog('TX', 'FitShow_FFF0', this.buf2hex(buffer.buffer), `ส่งคำสั่งสปีด: ${clamped} km/h`);
        return true;
      }
    } catch (err: any) {
      this.addLog('SYS', this.protocol, '', `ส่งคำสั่งไม่สำเร็จ: ${err.message}`);
    }
    return false;
  }

  /**
   * Send incline command to treadmill (0 to 20 levels)
   */
  public async setIncline(inclineLevel: number): Promise<boolean> {
    const clamped = Math.min(Math.max(Math.round(inclineLevel), 0), 20);

    if (this.protocol === 'Simulation') {
      this.metrics.inclineLevel = clamped;
      this.addLog('TX', 'Simulation', '', `จำลองปรับความชันเป็นระดับ ${clamped}`);
      if (this.onDataCallback) this.onDataCallback({ ...this.metrics });
      return true;
    }

    if (!this.controlChar) {
      this.addLog('SYS', this.protocol, '', 'ลู่วิ่งไม่อนุญาตให้ส่งคำสั่งควบคุม (โหมดอ่านอย่างเดียว)');
      return false;
    }

    try {
      if (this.protocol === 'FTMS') {
        // FTMS Set Target Inclination: Opcode 0x03, int16 in 0.1%
        const rawIncline = clamped * 10;
        const buffer = new Uint8Array([0x03, rawIncline & 0xff, (rawIncline >> 8) & 0xff]);
        await this.controlChar.writeValue(buffer);
        this.addLog('TX', 'FTMS', this.buf2hex(buffer.buffer), `ส่งคำสั่งความชัน: ระดับ ${clamped}`);
        return true;
      } else if (this.protocol === 'FitShow_FFF0') {
        // FitShow Incline Frame: 0x02 0x55 0x01 <level> <checksum> 0x03
        const checksum = (0x02 ^ 0x55 ^ 0x01 ^ clamped) & 0xff;
        const buffer = new Uint8Array([0x02, 0x55, 0x01, clamped, checksum, 0x03]);
        await this.controlChar.writeValue(buffer);
        this.addLog('TX', 'FitShow_FFF0', this.buf2hex(buffer.buffer), `ส่งคำสั่งความชัน: ระดับ ${clamped}`);
        return true;
      }
    } catch (err: any) {
      this.addLog('SYS', this.protocol, '', `ส่งคำสั่งความชันไม่สำเร็จ: ${err.message}`);
    }
    return false;
  }

  public disconnect(): void {
    if (this.simulationInterval) {
      this.stopSimulation();
      return;
    }

    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.handleDisconnection();
  }

  public resetSession(): void {
    this.metrics = {
      speedKmh: 0,
      inclineLevel: 0,
      distanceMeters: 0,
      elapsedSeconds: 0,
      caloriesBurned: 0,
      elevationGainMeters: 0,
      currentPaceSecPerKm: 0,
      fatGramsBurned: 0,
    };
    if (this.onDataCallback) {
      this.onDataCallback({ ...this.metrics });
    }
    this.addLog('SYS', this.protocol, '', 'รีเซ็ตข้อมูลการออกกำลังกายเรียบร้อย');
  }

  /**
   * Starts Demo / Simulation mode for testing without a physical treadmill
   */
  public startSimulation(): void {
    this.disconnect();
    this.protocol = 'Simulation';
    this.deviceName = 'Virtual Demo Treadmill';
    this.updateStatus('connected', 'Simulation', this.deviceName);
    this.addLog('SYS', 'Simulation', '', 'เริ่มโหมดจำลอง (Simulation Mode) ความเร็วสูงสุด 16 กม./ชม.');

    let simSpeed = 4.0;
    let simIncline = 3;
    let phase = 0;

    this.simulationInterval = setInterval(() => {
      phase++;
      // Simulate varying speed and incline (walk, incline hike, run)
      if (phase % 15 === 0) {
        simIncline = Math.min(20, simIncline + 2);
      }
      if (phase % 25 === 0) {
        simSpeed = simSpeed >= 12.0 ? 5.0 : simSpeed + 1.5;
      }

      this.metrics.speedKmh = Number(simSpeed.toFixed(1));
      this.metrics.inclineLevel = simIncline;

      // Mock raw hex packet
      const rawHex = `02 53 ${Math.round(simSpeed * 10).toString(16).padStart(2, '0')} ${simIncline.toString(16).padStart(2, '0')} 00 00 03`;
      this.addLog('RX', 'Simulation', rawHex, `Sim: Speed=${simSpeed.toFixed(1)} km/h, Incline=${simIncline}`);

      if (this.onDataCallback) {
        this.onDataCallback({ ...this.metrics });
      }
    }, 1000);
  }

  public stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
      this.handleDisconnection();
    }
  }

  private handleDisconnection(): void {
    this.updateStatus('disconnected', 'Unknown');
    this.addLog('SYS', 'Unknown', '', 'ตัดการเชื่อมต่อกับอุปกรณ์แล้ว');
    this.releaseWakeLock();
    this.device = null;
    this.server = null;
  }

  /**
   * Parse FTMS (0x2ACD) packet
   */
  private parseFTMSPacket(dataView: DataView): void {
    const hex = this.buf2hex(dataView.buffer);
    if (dataView.byteLength < 4) return;

    const flags = dataView.getUint16(0, true);
    let offset = 2;

    // Instantaneous Speed (uint16, in 0.01 km/h)
    const rawSpeed = dataView.getUint16(offset, true);
    this.metrics.speedKmh = Number((rawSpeed / 100).toFixed(1));
    offset += 2;

    // Average Speed (bit 1)
    if (flags & (1 << 1)) {
      offset += 2;
    }

    // Total Distance (bit 2, uint24 in meters)
    if (flags & (1 << 2)) {
      if (dataView.byteLength >= offset + 3) {
        const d0 = dataView.getUint8(offset);
        const d1 = dataView.getUint8(offset + 1);
        const d2 = dataView.getUint8(offset + 2);
        this.metrics.distanceMeters = d0 | (d1 << 8) | (d2 << 16);
      }
      offset += 3;
    }

    // Inclination and Ramp Angle (bit 3)
    if (flags & (1 << 3)) {
      if (dataView.byteLength >= offset + 2) {
        // Incline in 0.1% percent
        const rawIncline = dataView.getInt16(offset, true);
        this.metrics.inclineLevel = Math.max(0, Math.round(rawIncline / 10));
      }
      offset += 4; // 2 for incline + 2 for ramp angle
    }

    // Heart Rate (bit 8)
    if (flags & (1 << 8)) {
      if (dataView.byteLength >= offset + 1) {
        this.metrics.heartRate = dataView.getUint8(offset);
      }
      offset += 1;
    }

    this.addLog('RX', 'FTMS', hex, `Speed: ${this.metrics.speedKmh} km/h | Incline: ${this.metrics.inclineLevel}`);
    if (this.onDataCallback) {
      this.onDataCallback({ ...this.metrics });
    }
  }

  /**
   * Parse FitShow Proprietary (0xFFF0) packet
   */
  private parseFitShowPacket(dataView: DataView): void {
    const hex = this.buf2hex(dataView.buffer);
    const len = dataView.byteLength;

    if (len < 5) {
      this.addLog('RX', 'FitShow_FFF0', hex, 'Packet สั้นเกินไป');
      return;
    }

    const header = dataView.getUint8(0);

    // Standard FitShow telemetry frame: starts with 0x02
    if (header === 0x02) {
      const cmd = dataView.getUint8(1);

      // Status/Telemetry command (usually 0x53 or 0x51)
      if (cmd === 0x53 || cmd === 0x51 || cmd === 0x82) {
        // Speed is commonly at byte 3 (scaled by 10)
        const rawSpeed = dataView.getUint8(3);
        if (rawSpeed <= 160) { // Safety guard: max 16.0 km/h
          this.metrics.speedKmh = Number((rawSpeed / 10).toFixed(1));
        }

        // Incline is commonly at byte 4 (0-20)
        if (len >= 5) {
          const rawIncline = dataView.getUint8(4);
          if (rawIncline <= 20) {
            this.metrics.inclineLevel = rawIncline;
          }
        }
      }
    }

    this.addLog('RX', 'FitShow_FFF0', hex, `Speed: ${this.metrics.speedKmh} km/h | Incline: ${this.metrics.inclineLevel}`);
    if (this.onDataCallback) {
      this.onDataCallback({ ...this.metrics });
    }
  }

  /**
   * Accumulates distance, calories, elevation gain, and elapsed time every 1 second
   */
  private startMetricsTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      // Only accumulate when treadmill belt is moving
      if (this.metrics.speedKmh > 0.1 && (this.status === 'connected' || this.protocol === 'Simulation')) {
        this.metrics.elapsedSeconds += 1;

        // Distance per second = speedKmh * 1000 / 3600
        const distanceDeltaMeters = (this.metrics.speedKmh * 1000) / 3600;
        this.metrics.distanceMeters += distanceDeltaMeters;

        // Elevation Gain Delta = distanceDelta * grade fraction
        const grade = Math.min(this.metrics.inclineLevel, 20) / 100;
        this.metrics.elevationGainMeters += distanceDeltaMeters * grade;

        // ACSM Incline-adjusted Calorie Burn
        const calPerSec = calculateAcsmCaloriesPerSecond(
          this.metrics.speedKmh,
          this.metrics.inclineLevel,
          this.userWeightKg
        );
        this.metrics.caloriesBurned += calPerSec;

        // Fat oxidized in grams
        this.metrics.fatGramsBurned = calculateFatGramsBurned(
          this.metrics.caloriesBurned,
          this.metrics.speedKmh,
          this.metrics.inclineLevel
        );

        // Pace
        this.metrics.currentPaceSecPerKm = Math.round(3600 / this.metrics.speedKmh);

        if (this.onDataCallback) {
          this.onDataCallback({ ...this.metrics });
        }

        // Emit telemetry point every 3 seconds for charting
        if (this.metrics.elapsedSeconds % 3 === 0 && this.onTelemetryCallback) {
          this.onTelemetryCallback({
            second: this.metrics.elapsedSeconds,
            speed: this.metrics.speedKmh,
            incline: this.metrics.inclineLevel,
          });
        }
      }
    }, 1000);
  }

  private async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.addLog('SYS', this.protocol, '', 'เปิดใช้งาน Screen Wake Lock (หน้าจอจะไม่ดับขณะวิ่ง)');
      }
    } catch (err: any) {
      console.warn('Wake Lock request error:', err);
    }
  }

  private releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  private updateStatus(status: ConnectionStatus, protocol: BluetoothProtocol, deviceName?: string): void {
    this.status = status;
    this.protocol = protocol;
    if (this.onStatusCallback) {
      this.onStatusCallback(status, protocol, deviceName);
    }
  }

  private addLog(direction: 'RX' | 'TX' | 'SYS', protocol: BluetoothProtocol, hex: string, decodedSummary?: string): void {
    if (this.onLogCallback) {
      const timestamp = new Date().toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.onLogCallback({
        id: Math.random().toString(36).substring(2, 9),
        timestamp,
        direction,
        protocol,
        hex,
        decodedSummary
      });
    }
  }

  private buf2hex(buffer: ArrayBufferLike): string {
    return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join(' ');
  }
}

export const bluetoothService = new TreadmillBluetoothService();
