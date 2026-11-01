// Smart Hybrid Driver Engine
// Manages Direct Web Bluetooth (BLE), Direct WebUSB (OTG), Android RawBT Intent, and Browser Fallback.

import { 
  buildReceiptEscPos, 
  buildTestReceiptEscPos, 
  ReceiptData 
} from './escpos';
import { 
  printViaBluetooth, 
  getBluetoothState, 
  connectBluetoothPrinter 
} from './bluetoothPrinter';
import { 
  printViaUsb, 
  getUsbState, 
  connectUsbPrinter 
} from './usbPrinter';
import { 
  getPrinterSettings, 
  PrinterSettings 
} from './printerSettings';

export type PrintMethodUsed = 'bluetooth' | 'usb' | 'rawbt' | 'browser';

export interface PrintResult {
  success: boolean;
  method: PrintMethodUsed;
  message?: string;
}

/**
 * Cek apakah ada printer native (Bluetooth atau USB) yang saat ini aktif terhubung
 */
export function isNativePrinterConnected(): boolean {
  const bt = getBluetoothState();
  const usb = getUsbState();
  return Boolean(bt.connected || usb.connected);
}

/**
 * Dapatkan info perangkat printer native yang sedang aktif
 */
export function getActiveNativePrinterInfo(): {
  type: 'bluetooth' | 'usb' | 'none';
  name: string | null;
} {
  const bt = getBluetoothState();
  if (bt.connected) {
    return { type: 'bluetooth', name: bt.deviceName || 'Bluetooth Printer' };
  }
  const usb = getUsbState();
  if (usb.connected) {
    return { type: 'usb', name: usb.deviceName || 'USB Printer' };
  }
  return { type: 'none', name: null };
}

/**
 * Kirim data struk langsung ke aplikasi RawBT di Android (Jalur Darurat untuk Bluetooth Classic SPP 2.0)
 */
export function sendToRawBtAndroid(bytes: Uint8Array): void {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  // Intent format untuk RawBT thermal printer driver di Android
  const rawBtUrl = `rawbt:data:application/octet-stream;base64,${base64}`;
  
  const a = document.createElement('a');
  a.href = rawBtUrl;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 500);
}

/**
 * Cetak Struk Transaksi dengan Smart Hybrid Driver Engine:
 * 1. Jika Bluetooth terhubung -> cetak langsung via BLE (0 detik, tanpa dialog)
 * 2. Jika USB terhubung -> cetak langsung via WebUSB
 * 3. Jika tidak ada -> fallback ke window.print() (dialog cetak browser)
 */
export async function printReceipt(
  receiptData: ReceiptData,
  customSettings?: Partial<PrinterSettings>
): Promise<PrintResult> {
  const settings = { ...getPrinterSettings(), ...customSettings };
  const copies = Math.max(1, settings.printCopies || 1);

  // Buat data ESC/POS biner
  const escposBytes = buildReceiptEscPos(receiptData, {
    paperWidth: settings.paperWidth,
    shopName: settings.shopName,
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    whatsappNumber: settings.whatsappNumber,
    showSocialMedia: settings.showSocialMedia,
    facebookName: settings.facebookName,
    instagramName: settings.instagramName,
    tiktokName: settings.tiktokName,
    showImei: settings.showImei,
    warningNote: settings.warningNote,
    footerNote: settings.footerNote,
    feedLinesBottom: settings.feedLinesBottom ?? 2,
    enableAutoCut: settings.enableAutoCut ?? false,
  });

  const btState = getBluetoothState();
  const usbState = getUsbState();

  // Engine 1: Direct Web Bluetooth (BLE Native)
  if (btState.connected) {
    try {
      for (let i = 0; i < copies; i++) {
        await printViaBluetooth(escposBytes);
        if (i < copies - 1) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
      return {
        success: true,
        method: 'bluetooth',
        message: `Struk berhasil dicetak langsung ke ${btState.deviceName || 'Printer Bluetooth'}!`,
      };
    } catch (err: any) {
      console.warn('Gagal cetak Bluetooth, mencoba fallback:', err);
      // Fallback ke window.print() jika Bluetooth tiba-tiba putus di tengah jalan
      if (typeof window !== 'undefined') {
        window.print();
        return {
          success: true,
          method: 'browser',
          message: `Koneksi Bluetooth terganggu (${err.message}). Beralih ke dialog cetak browser.`,
        };
      }
      throw err;
    }
  }

  // Engine 2: Direct WebUSB (OTG Native)
  if (usbState.connected) {
    try {
      for (let i = 0; i < copies; i++) {
        await printViaUsb(escposBytes);
        if (i < copies - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
      return {
        success: true,
        method: 'usb',
        message: `Struk berhasil dicetak langsung ke ${usbState.deviceName || 'Printer USB'}!`,
      };
    } catch (err: any) {
      console.warn('Gagal cetak USB, beralih ke dialog cetak:', err);
      if (typeof window !== 'undefined') {
        window.print();
        return {
          success: true,
          method: 'browser',
          message: `USB error: ${err.message}. Beralih ke cetak browser.`,
        };
      }
      throw err;
    }
  }

  // Engine 3: Dialog Cetak Browser Bawaan (window.print())
  if (typeof window !== 'undefined') {
    window.print();
    return {
      success: true,
      method: 'browser',
      message: 'Membuka dialog cetak browser.',
    };
  }

  return {
    success: false,
    method: 'browser',
    message: 'Lingkungan browser tidak ditemukan.',
  };
}

/**
 * Tes Cetak Struk Fisik Menggunakan Perintah ESC/POS Native
 */
export async function testPrintNative(
  preferredDeviceName?: string,
  paperWidth?: '58mm' | '80mm'
): Promise<PrintResult> {
  const settings = getPrinterSettings();
  const width = paperWidth || settings.paperWidth || '58mm';

  const btState = getBluetoothState();
  const usbState = getUsbState();

  if (btState.connected) {
    const devName = preferredDeviceName || btState.deviceName || 'Printer Bluetooth';
    const testBytes = buildTestReceiptEscPos(devName, width, 'Bluetooth BLE Native', settings.feedLinesBottom ?? 2, settings.enableAutoCut ?? false);
    await printViaBluetooth(testBytes);
    return {
      success: true,
      method: 'bluetooth',
      message: `Tes cetak native berhasil dikirim ke ${devName}!`,
    };
  }

  if (usbState.connected) {
    const devName = preferredDeviceName || usbState.deviceName || 'Printer USB';
    const testBytes = buildTestReceiptEscPos(devName, width, 'WebUSB Direct OTG', settings.feedLinesBottom ?? 2, settings.enableAutoCut ?? false);
    await printViaUsb(testBytes);
    return {
      success: true,
      method: 'usb',
      message: `Tes cetak native berhasil dikirim ke ${devName}!`,
    };
  }

  throw new Error('Belum ada printer Bluetooth atau USB yang terhubung secara native. Silakan klik tombol "Hubungkan Bluetooth" atau "Hubungkan USB OTG" terlebih dahulu.');
}

