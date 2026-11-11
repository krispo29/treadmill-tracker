import type { BluetoothProtocol, ConnectionStatus, PacketLog, TelemetryPoint, TreadmillMetrics } from '../types/treadmill';
import { calculateAcsmCaloriesPerSecond, calculateFatGramsBurned } from './calculations';

// Standard FTMS Service & Characteristics (128-bit lowercase standard UUIDs for 100% iOS/Bluefy compatibility)
export const UUID_FTMS_SERVICE = '00001826-0000-1000-8000-00805f9b34fb';
export const UUID_FTMS_TREADMILL_DATA = '00002acd-0000-1000-8000-00805f9b34fb';
export const UUID_FTMS_CONTROL_POINT = '00002ad9-0000-1000-8000-00805f9b34fb'; // 0x2AD9 = Fitness Machine Control Point
export const UUID_FTMS_STATUS = '00002ada-0000-1000-8000-00805f9b34fb'; // 0x2ADA = Fitness Machine Status

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
  private lastTickTime: number = Date.now();
  private sessionPacketLogs: PacketLog[] = [];

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

        // Try getting control point (0x2AD9)
        try {
          this.controlChar = await ftmsService.getCharacteristic(UUID_FTMS_CONTROL_POINT);
          this.addLog('SYS', 'FTMS', '', 'พบ Control Point สำหรับส่งคำสั่งสปีด/ความชัน (0x2AD9)');

          // Enable indications / notifications for command responses
          try {
            await this.controlChar.startNotifications();
            this.controlChar.addEventListener('characteristicvaluechanged', (e: any) => {
              this.handleControlPointResponse(new Uint8Array(e.target.value.buffer));
            });
            this.addLog('SYS', 'FTMS', '', 'เปิดรับสัญญาณตอบรับจาก Control Point เรียบร้อย');
          } catch (indErr) {
            console.warn('Control point indication error:', indErr);
          }

          // Request Control immediately (Opcode 0x00)
          await this.requestFtmsControl();
        } catch (cpErr: any) {
          this.addLog('SYS', 'FTMS', '', `ไม่พบ Control Point 0x2AD9: ${cpErr.message}`);
        }

        // Try getting FTMS Machine Status (0x2ADA) to detect physical Stop/Pause/Safety Key
        try {
          const statusChar = await ftmsService.getCharacteristic(UUID_FTMS_STATUS);
          await statusChar.startNotifications();
          statusChar.addEventListener('characteristicvaluechanged', (e: any) => {
            this.handleFtmsMachineStatus(e.target.value);
          });
          this.addLog('SYS', 'FTMS', '', 'เปิดรับสถานะเครื่องลู่วิ่ง (0x2ADA Machine Status)');
        } catch (statusErr: any) {
          console.log('Optional 0x2ADA status characteristic not available:', statusErr);
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

  private hasFtmsControl: boolean = false;

  /**
   * Request control of the FTMS machine (Opcode 0x00)
   */
  public async requestFtmsControl(): Promise<boolean> {
    if (!this.controlChar || this.protocol !== 'FTMS') return false;
    try {
      this.addLog('TX', 'FTMS', '00', 'ส่งคำสั่งขอสิทธิ์ควบคุมลู่ (Request Control: 0x00)...');
      await this.writeControlData(new Uint8Array([0x00]));
      this.hasFtmsControl = true;
      return true;
    } catch (err: any) {
      this.addLog('SYS', 'FTMS', '', `ขอสิทธิ์ควบคุมไม่สำเร็จ: ${err.message}`);
      return false;
    }
  }

  /**
   * Handle Indication responses from Control Point (0x2AD9)
   */
  private handleControlPointResponse(data: Uint8Array) {
    if (data.length < 3) return;
    const requestOpcode = data[1];
    const resultCode = data[2];

    const opcodeNames: Record<number, string> = {
      0x00: 'Request Control',
      0x01: 'Reset',
      0x02: 'Set Speed',
      0x03: 'Set Incline',
      0x07: 'Start / Resume',
      0x08: 'Stop / Pause'
    };

    const resultNames: Record<number, string> = {
      0x01: 'สำเร็จ (Success) ✅',
      0x02: 'ไม่รองรับคำสั่งนี้',
      0x03: 'พารามิเตอร์ผิดพลาด',
      0x04: 'ล้มเหลว',
      0x05: 'ยังไม่ได้รับสิทธิ์ควบคุม'
    };

    const opName = opcodeNames[requestOpcode] || `Opcode 0x${requestOpcode.toString(16)}`;
    const resName = resultNames[resultCode] || `Result 0x${resultCode.toString(16)}`;

    this.addLog('RX', 'FTMS', this.buf2hex(data.buffer), `ตอบกลับ [${opName}]: ${resName}`);
    if (resultCode === 0x01 && requestOpcode === 0x00) {
      this.hasFtmsControl = true;
    }
  }

  /**
   * Handle FTMS Machine Status notifications (0x2ADA)
   * Detects console Stop/Pause, Safety Key release, and reset events.
   */
  private handleFtmsMachineStatus(dataView: DataView) {
    if (dataView.byteLength < 1) return;
    const opcode = dataView.getUint8(0);
    const param = dataView.byteLength >= 2 ? dataView.getUint8(1) : 0x01;
    const hex = this.buf2hex(dataView.buffer);

    const statusNames: Record<number, string> = {
      0x01: 'Reset',
      0x02: param === 0x02 ? 'Paused by user' : 'Stopped by user',
      0x03: 'Stopped by Safety Key',
      0x04: 'Started or Resumed by user',
    };
    const sName = statusNames[opcode] || `Status 0x${opcode.toString(16)}`;
    this.addLog('RX', 'FTMS', hex, `สถานะเครื่องลู่วิ่ง (Machine Status): ${sName}`);

    // Only halt speed on actual Stop (0x02 param != 0x02) or Safety Key (0x03).
    // Do NOT halt on initial Reset (0x01) or Pause (0x02 param 0x02) to prevent unwanted Recap popup.
    if (opcode === 0x03 || (opcode === 0x02 && param !== 0x02)) {
      this.metrics.speedKmh = 0;
      if (this.onDataCallback) {
        this.onDataCallback({ ...this.metrics, speedKmh: 0 });
      }
    }
  }

  /**
   * Low-level helper to write data to control characteristic with response fallback
   */
  private async writeControlData(buffer: Uint8Array): Promise<void> {
    if (!this.controlChar) throw new Error('Control Point not ready');
    try {
      if (this.controlChar.writeValueWithResponse) {
        await this.controlChar.writeValueWithResponse(buffer);
      } else {
        await this.controlChar.writeValue(buffer);
      }
    } catch (err) {
      if (this.controlChar.writeValueWithoutResponse) {
        await this.controlChar.writeValueWithoutResponse(buffer);
      } else {
        throw err;
      }
    }
  }

  /**
   * Starts Manual workout mode (No Bluetooth required, user controls speed/incline directly)
   */
  public startManualMode(initialSpeed: number = 3.0, initialIncline: number = 0): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.protocol = 'Simulation';
    this.deviceName = 'โหมดวิ่งอิสระ (Manual Jog)';
    this.updateStatus('connected', 'Simulation', this.deviceName);
    this.metrics.speedKmh = initialSpeed;
    this.metrics.inclineLevel = initialIncline;
    this.addLog('SYS', 'Simulation', '', `เริ่มโหมดวิ่งอิสระ (Manual Jog) ที่ความเร็ว ${initialSpeed} km/h`);
    if (this.onDataCallback) {
      this.onDataCallback({ ...this.metrics });
    }
  }

  /**
   * Start or Resume treadmill belt (Start at 3.0 km/h or custom speed)
   */
  public async startTreadmill(speedKmh: number = 3.0): Promise<boolean> {
    if (this.protocol === 'Simulation') {
      this.metrics.speedKmh = speedKmh;
      this.addLog('TX', 'Simulation', '', `ปรับสปีดเริ่มเดินที่ ${speedKmh} km/h`);
      if (this.onDataCallback) this.onDataCallback({ ...this.metrics });
      return true;
    }

    if (!this.controlChar) {
      // Seamlessly start manual mode so standalone web/iPad users can jog without Bluetooth!
      this.startManualMode(speedKmh);
      return true;
    }

    try {
      if (this.protocol === 'FTMS') {
        if (!this.hasFtmsControl) {
          await this.requestFtmsControl();
        }
        this.addLog('TX', 'FTMS', '07', 'ส่งคำสั่งเริ่มสายพานลู่ (Start: 0x07)...');
        await this.writeControlData(new Uint8Array([0x07]));
        
        // Wait 400ms for motor initiation, then set speed
        setTimeout(async () => {
          await this.setSpeed(speedKmh);
        }, 400);
        return true;
      } else if (this.protocol === 'FitShow_FFF0') {
        const startBuffer = new Uint8Array([0x02, 0x53, 0x01, 0x01, 0x51, 0x03]);
        await this.writeControlData(startBuffer);
        this.addLog('TX', 'FitShow_FFF0', this.buf2hex(startBuffer.buffer), 'ส่งคำสั่งเริ่มสายพาน FitShow');
        setTimeout(async () => {
          await this.setSpeed(speedKmh);
        }, 400);
        return true;
      }
    } catch (err: any) {
      this.addLog('SYS', this.protocol, '', `สั่งเริ่มสายพานไม่สำเร็จ: ${err.message}`);
    }
    return false;
  }

  /**
   * Stop treadmill belt
   */
  public async stopTreadmill(): Promise<boolean> {
    if (this.protocol === 'Simulation' || !this.controlChar) {
      this.metrics.speedKmh = 0;
      this.addLog('TX', 'Simulation', '', 'หยุดสายพานลู่วิ่ง');
      if (this.onDataCallback) this.onDataCallback({ ...this.metrics });
      return true;
    }

    try {
      if (this.protocol === 'FTMS') {
        this.addLog('TX', 'FTMS', '08 01', 'ส่งคำสั่งหยุดลู่ (Stop: 0x08 0x01)...');
        await this.writeControlData(new Uint8Array([0x08, 0x01]));
        // Immediately halt metrics accumulation so the timer stops ticking
        this.metrics.speedKmh = 0;
        if (this.onDataCallback) this.onDataCallback({ ...this.metrics, speedKmh: 0 });
        return true;
      } else if (this.protocol === 'FitShow_FFF0') {
        const stopBuffer = new Uint8Array([0x02, 0x53, 0x01, 0x02, 0x52, 0x03]);
        await this.writeControlData(stopBuffer);
        this.addLog('TX', 'FitShow_FFF0', this.buf2hex(stopBuffer.buffer), 'ส่งคำสั่งหยุดลู่ FitShow');
        // Immediately halt metrics accumulation so the timer stops ticking
        this.metrics.speedKmh = 0;
        if (this.onDataCallback) this.onDataCallback({ ...this.metrics, speedKmh: 0 });
        return true;
      }
    } catch (err: any) {
      this.addLog('SYS', this.protocol, '', `สั่งหยุดลู่ไม่สำเร็จ: ${err.message}`);
    }
    return false;
  }

  /**
   * Send speed command to treadmill (0.0 to 16.0 km/h)
   */
  public async setSpeed(speedKmh: number): Promise<boolean> {
    const clamped = Math.min(Math.max(Number(speedKmh.toFixed(1)), 0), 16.0);

    if (this.protocol === 'Simulation' || !this.controlChar) {
      this.metrics.speedKmh = clamped;
      this.addLog('TX', 'Simulation', '', `ปรับความเร็วเป็น ${clamped} km/h`);
      if (this.onDataCallback) this.onDataCallback({ ...this.metrics });
      return true;
    }

    try {
      if (this.protocol === 'FTMS') {
        if (!this.hasFtmsControl) {
          await this.requestFtmsControl();
        }

        // If currently stopped and setting speed > 0, issue Start command first
        if (clamped > 0 && this.metrics.speedKmh === 0) {
          try {
            this.addLog('TX', 'FTMS', '07', 'สั่งเริ่มเดินสายพานก่อนปรับสปีด (Start: 0x07)...');
            await this.writeControlData(new Uint8Array([0x07]));
            await new Promise((r) => setTimeout(r, 200));
          } catch {}
        } else if (clamped === 0) {
          // Setting 0 km/h is Stop
          return await this.stopTreadmill();
        }

        // FTMS Set Target Speed: Opcode 0x02, uint16 speed in 0.01 km/h
        const rawSpeed = Math.round(clamped * 100);
        const buffer = new Uint8Array([0x02, rawSpeed & 0xff, (rawSpeed >> 8) & 0xff]);
        await this.writeControlData(buffer);
        this.addLog('TX', 'FTMS', this.buf2hex(buffer.buffer), `ส่งคำสั่งสปีด: ${clamped} km/h`);
        return true;
      } else if (this.protocol === 'FitShow_FFF0') {
        if (clamped === 0) {
          return await this.stopTreadmill();
        }
        // FitShow Speed Frame: 0x02 0x53 0x02 <speed*10> <checksum> 0x03
        const rawSpeed = Math.round(clamped * 10);
        const checksum = (0x02 ^ 0x53 ^ 0x02 ^ rawSpeed) & 0xff;
        const buffer = new Uint8Array([0x02, 0x53, 0x02, rawSpeed, checksum, 0x03]);
        await this.writeControlData(buffer);
        this.addLog('TX', 'FitShow_FFF0', this.buf2hex(buffer.buffer), `ส่งคำสั่งสปีด: ${clamped} km/h`);
        return true;
      }
    } catch (err: any) {
      this.addLog('SYS', this.protocol, '', `ส่งคำสั่งสปีดไม่สำเร็จ: ${err.message}`);
    }
    return false;
  }

  /**
   * Send incline command to treadmill (0 to 20 levels)
   */
  public async setIncline(inclineLevel: number): Promise<boolean> {
    const clamped = Math.min(Math.max(Math.round(inclineLevel), 0), 20);

    if (this.protocol === 'Simulation' || !this.controlChar) {
      this.metrics.inclineLevel = clamped;
      this.addLog('TX', 'Simulation', '', `ปรับความชันเป็นระดับ ${clamped}`);
      if (this.onDataCallback) this.onDataCallback({ ...this.metrics });
      return true;
    }

    try {
      if (this.protocol === 'FTMS') {
        if (!this.hasFtmsControl) {
          await this.requestFtmsControl();
        }

        // FTMS Set Target Inclination: Opcode 0x03, int16 in 0.1%
        const rawIncline = clamped * 10;
        const buffer = new Uint8Array([0x03, rawIncline & 0xff, (rawIncline >> 8) & 0xff]);
        await this.writeControlData(buffer);
        this.metrics.inclineLevel = clamped;
        this.addLog('TX', 'FTMS', this.buf2hex(buffer.buffer), `ส่งคำสั่งความชัน: ระดับ ${clamped}`);
        if (this.onDataCallback) this.onDataCallback({ ...this.metrics });
        return true;
      } else if (this.protocol === 'FitShow_FFF0') {
        // FitShow Incline Frame: 0x02 0x55 0x01 <level> <checksum> 0x03
        const checksum = (0x02 ^ 0x55 ^ 0x01 ^ clamped) & 0xff;
        const buffer = new Uint8Array([0x02, 0x55, 0x01, clamped, checksum, 0x03]);
        await this.writeControlData(buffer);
        this.metrics.inclineLevel = clamped;
        this.addLog('TX', 'FitShow_FFF0', this.buf2hex(buffer.buffer), `ส่งคำสั่งความชัน: ระดับ ${clamped}`);
        if (this.onDataCallback) this.onDataCallback({ ...this.metrics });
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
    this.lastTickTime = Date.now();
    this.sessionPacketLogs = [];
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
    if (dataView.byteLength < 2) return;


    const flags = dataView.getUint16(0, true);
    let offset = 2;

    // Bit 0: More Data
    // In Bluetooth SIG FTMS:
    // 0 = Instantaneous Speed IS present (uint16, 0.01 km/h)
    // 1 = Instantaneous Speed NOT present (secondary / continuation packet)
    const hasInstantaneousSpeed = (flags & (1 << 0)) === 0;

    if (hasInstantaneousSpeed) {
      if (dataView.byteLength >= offset + 2) {
        const rawSpeed = dataView.getUint16(offset, true);
        this.metrics.speedKmh = Number((rawSpeed / 100).toFixed(1));
        offset += 2;
      }
    }

    // Average Speed (bit 1)
    if (flags & (1 << 1)) {
      offset += 2;
    }

    // Total Distance (bit 2, uint24 in meters) — defer jump catch-up until incline is parsed below
    let parsedDist: number | null = null;
    if (flags & (1 << 2)) {
      if (dataView.byteLength >= offset + 3) {
        const d0 = dataView.getUint8(offset);
        const d1 = dataView.getUint8(offset + 1);
        const d2 = dataView.getUint8(offset + 2);
        parsedDist = d0 | (d1 << 8) | (d2 << 16);
      }
      offset += 3;
    }

    // Inclination and Ramp Angle (bit 3) — parse BEFORE distance catch-up so incline grade is current
    if (flags & (1 << 3)) {
      if (dataView.byteLength >= offset + 2) {
        // Incline in 0.1% percent
        const rawIncline = dataView.getInt16(offset, true);
        this.metrics.inclineLevel = Math.max(0, Math.round(rawIncline / 10));
      }
      offset += 4; // 2 for incline + 2 for ramp angle
    }

    // Apply distance & catch up elevation gain + ACSM calories if hardware jumped ahead (e.g. screen locked / mid-run reconnect)
    if (parsedDist !== null && parsedDist > 0) {
      const distJump = parsedDist - this.metrics.distanceMeters;
      if (distJump > 25) {
        const grade = Math.min(this.metrics.inclineLevel, 20) / 100;
        this.metrics.elevationGainMeters += distJump * grade;

        const effectiveSpeed = this.metrics.speedKmh > 0.5 ? this.metrics.speedKmh : 4.5;
        const jumpedSeconds = (distJump / 1000) / (effectiveSpeed / 3600);
        const calPerSec = calculateAcsmCaloriesPerSecond(
          effectiveSpeed,
          this.metrics.inclineLevel,
          this.userWeightKg
        );
        this.metrics.caloriesBurned += calPerSec * jumpedSeconds;
        this.metrics.fatGramsBurned = calculateFatGramsBurned(
          this.metrics.caloriesBurned,
          effectiveSpeed,
          this.metrics.inclineLevel
        );
      }
      this.metrics.distanceMeters = parsedDist;
    }

    // Elevation Gain (bit 4)
    if (flags & (1 << 4)) {
      offset += 4; // 2 positive + 2 negative
    }

    // Instantaneous Pace (bit 5)
    if (flags & (1 << 5)) {
      offset += 1;
    }

    // Average Pace (bit 6)
    if (flags & (1 << 6)) {
      offset += 1;
    }

    // Expended Energy (bit 7) — advance offset without overwriting scientific ACSM incline + weight calories
    if (flags & (1 << 7)) {
      offset += 5; // 2 total + 2 per hour + 1 per min
    }

    // Heart Rate (bit 8)
    if (flags & (1 << 8)) {
      if (dataView.byteLength >= offset + 1) {
        const hr = dataView.getUint8(offset);
        if (hr > 30 && hr < 240) {
          this.metrics.heartRate = hr;
        }
      }
      offset += 1;
    }

    // Metabolic Equivalent (bit 9, uint8 in 0.1 MET)
    if (flags & (1 << 9)) {
      offset += 1;
    }

    // Elapsed Time (bit 10, uint16 in seconds)
    if (flags & (1 << 10)) {
      if (dataView.byteLength >= offset + 2) {
        const timeSec = dataView.getUint16(offset, true);
        if (timeSec > 0) {
          this.metrics.elapsedSeconds = timeSec;
        }
      }
      offset += 2;
    }

    // Remaining Time (bit 11, uint16 in seconds)
    if (flags & (1 << 11)) {
      offset += 2;
    }

    // Force on Belt and Power Output (bit 12, 4 bytes)
    if (flags & (1 << 12)) {
      offset += 4;
    }

    // Stride Count / Steps (bit 13, uint16)
    if (flags & (1 << 13)) {
      if (dataView.byteLength >= offset + 2) {
        const strides = dataView.getUint16(offset, true);
        if (strides > 0) {
          this.metrics.cadence = strides;
        }
      }
      offset += 2;
    }

    // Format descriptive log
    if (hasInstantaneousSpeed) {
      this.addLog(
        'RX', 
        'FTMS', 
        hex, 
        `Speed: ${this.metrics.speedKmh} km/h | Incline: ${this.metrics.inclineLevel} | Dist: ${this.metrics.distanceMeters}m | Time: ${this.metrics.elapsedSeconds}s`
      );
      if (this.onDataCallback) {
        this.onDataCallback({ ...this.metrics });
      }
    } else {
      // Secondary packet (e.g. 01 20 00 00 00) - does not contain speed, do NOT wipe speedKmh
      this.addLog('RX', 'FTMS', hex, `FTMS ข้อมูลเสริม (Flags: 0x${flags.toString(16)})`);
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
      } else if (cmd === 0x55) {
        // Dedicated Incline command frame (0x02 0x55 0x01 <level> <checksum> 0x03)
        const rawIncline = len >= 4 ? dataView.getUint8(3) : (len >= 3 ? dataView.getUint8(2) : 0);
        if (rawIncline <= 20) {
          this.metrics.inclineLevel = rawIncline;
        }
      }
    }

    this.addLog('RX', 'FitShow_FFF0', hex, `Speed: ${this.metrics.speedKmh} km/h | Incline: ${this.metrics.inclineLevel}`);
    if (this.onDataCallback) {
      this.onDataCallback({ ...this.metrics });
    }
  }

  /**
   * Accumulates distance, calories, elevation gain, and elapsed time using wall-clock delta
   * (Prevents time/metric loss when tab is backgrounded or screen sleeps)
   */
  private handleVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && !document.hidden) {
      this.tickMetrics();
    }
  };

  private tickMetrics(): void {
    const now = Date.now();
    const deltaMs = now - this.lastTickTime;
    this.lastTickTime = now;

    // Safety guard: max single jump 3600 seconds (1 hour) to handle mobile screen wake-up safely
    const deltaSeconds = Math.min(Math.max(deltaMs / 1000, 0), 3600);

    // Only accumulate when treadmill belt is moving
    if (this.metrics.speedKmh > 0.1 && (this.status === 'connected' || this.protocol === 'Simulation')) {
      this.metrics.elapsedSeconds += deltaSeconds;

      // Distance per second = speedKmh * 1000 / 3600
      const distanceDeltaMeters = (this.metrics.speedKmh * 1000 / 3600) * deltaSeconds;
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
      this.metrics.caloriesBurned += calPerSec * deltaSeconds;

      // Fat oxidized in grams
      this.metrics.fatGramsBurned = calculateFatGramsBurned(
        this.metrics.caloriesBurned,
        this.metrics.speedKmh,
        this.metrics.inclineLevel
      );

      // Pace
      this.metrics.currentPaceSecPerKm = Math.round(3600 / this.metrics.speedKmh);

      if (this.onDataCallback) {
        this.onDataCallback({
          ...this.metrics,
          elapsedSeconds: Math.round(this.metrics.elapsedSeconds),
        });
      }

      // Emit telemetry point every 3 seconds for charting
      const roundedSec = Math.round(this.metrics.elapsedSeconds);
      if (roundedSec % 3 === 0 && this.onTelemetryCallback) {
        this.onTelemetryCallback({
          second: roundedSec,
          speed: this.metrics.speedKmh,
          incline: this.metrics.inclineLevel,
        });
      }
    }
  }

  private startMetricsTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.lastTickTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.tickMetrics();
    }, 1000);

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
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
    const timestamp = new Date().toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logItem: PacketLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      direction,
      protocol,
      hex,
      decodedSummary
    };

    // Keep session logs buffer for post-workout diagnostic & reverse-engineering analysis
    this.sessionPacketLogs.push(logItem);
    if (this.sessionPacketLogs.length > 5000) {
      this.sessionPacketLogs.shift();
    }

    if (this.onLogCallback) {
      this.onLogCallback(logItem);
    }
  }

  public getSessionPacketLogs(): PacketLog[] {
    return [...this.sessionPacketLogs];
  }

  public clearSessionPacketLogs(): void {
    this.sessionPacketLogs = [];
  }

  private buf2hex(buffer: ArrayBufferLike): string {
    return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join(' ');
  }
}

export const bluetoothService = new TreadmillBluetoothService();
