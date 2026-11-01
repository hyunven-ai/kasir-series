// Web Bluetooth Manager for Thermal ESC/POS Printers (BLE)
// Provides persistent GATT connection, characteristic auto-discovery, and chunked writing.

// UUID Layanan BLE Thermal Printer yang umum di pasaran (RPP02N, PT-210, POS-58, Zjiang, Goojprt, MPT)
export const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // ESC/POS Standard
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // PT-210, RPP02N, Goojprt
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Zjiang, POS-58 BLE UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic Mini Thermal
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent POS Profile
  '0000ae00-0000-1000-8000-00805f9b34fb', // JP-58 BLE
];

// UUID Karakteristik Tulis (Write / WriteWithoutResponse) yang umum
export const KNOWN_WRITE_CHARACTERISTICS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '49535343-1e4d-4bd9-ba61-23c647249616',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ae01-0000-1000-8000-00805f9b34fb',
];

export interface BluetoothPrinterState {
  connected: boolean;
  connecting: boolean;
  deviceName: string | null;
  deviceId: string | null;
  error: string | null;
}

// In-Memory persistent connection
let activeDevice: any = null;
let activeCharacteristic: any = null;
let connectionListeners: Array<(state: BluetoothPrinterState) => void> = [];

let currentState: BluetoothPrinterState = {
  connected: false,
  connecting: false,
  deviceName: null,
  deviceId: null,
  error: null,
};

function notifyListeners() {
  connectionListeners.forEach(listener => {
    try {
      listener({ ...currentState });
    } catch (e) {
      console.error('Error in bluetooth status listener:', e);
    }
  });
}

/** Periksa apakah browser mendukung Web Bluetooth */
export function isWebBluetoothSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return Boolean((navigator as any).bluetooth);
}

/** Subscribe ke perubahan status koneksi Bluetooth */
export function subscribeBluetoothStatus(listener: (state: BluetoothPrinterState) => void): () => void {
  connectionListeners.push(listener);
  listener({ ...currentState });
  return () => {
    connectionListeners = connectionListeners.filter(l => l !== listener);
  };
}

/** Dapatkan status saat ini */
export function getBluetoothState(): BluetoothPrinterState {
  return { ...currentState };
}

/** Cari characteristic untuk menulis instruksi ESC/POS */
async function findWriteCharacteristic(server: any): Promise<any> {
  // 1. Coba cari dari primary services yang diketahui terlebih dahulu
  for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      if (service) {
        // Coba cari characteristic yang diketahui di dalam service ini
        for (const charUuid of KNOWN_WRITE_CHARACTERISTICS) {
          try {
            const char = await service.getCharacteristic(charUuid);
            if (char && (char.properties.write || char.properties.writeWithoutResponse)) {
              return char;
            }
          } catch {
            // Lanjut cari
          }
        }
        // Jika characteristic spesifik tidak cocok, cari semua characteristic di service ini
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            return char;
          }
        }
      }
    } catch {
      // Service tidak ada pada perangkat ini, lanjut ke UUID berikutnya
    }
  }

  // 2. Fallback: Scan semua services yang disediakan oleh GATT server
  try {
    const services = await server.getPrimaryServices();
    for (const service of services) {
      try {
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            return char;
          }
        }
      } catch {
        // Abaikan error pada service tertentu
      }
    }
  } catch (e) {
    console.warn('Gagal membaca getPrimaryServices:', e);
  }

  throw new Error('Tidak ditemukan karakteristik penulisan data (Write Characteristic) pada printer ini.');
}

/**
 * Hubungkan ke printer thermal Bluetooth (membuka dialog pemindai browser)
 */
export async function connectBluetoothPrinter(): Promise<{ name: string; id: string }> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth tidak didukung pada browser ini. Gunakan Google Chrome di Android.');
  }

  // Jika sudah terhubung, langsung kembalikan
  if (activeDevice && activeDevice.gatt?.connected && activeCharacteristic) {
    return {
      name: activeDevice.name || 'Printer Bluetooth',
      id: activeDevice.id,
    };
  }

  currentState = {
    ...currentState,
    connecting: true,
    error: null,
  };
  notifyListeners();

  try {
    // Minta user memilih printer Bluetooth
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_PRINTER_SERVICES,
    });

    if (!device) {
      throw new Error('Tidak ada perangkat yang dipilih.');
    }

    // Pasang listener saat koneksi terputus
    device.addEventListener('gattserverdisconnected', onDeviceDisconnected);

    // Buka koneksi GATT
    const server = await device.gatt.connect();

    // Temukan characteristic penulisan data
    const char = await findWriteCharacteristic(server);

    activeDevice = device;
    activeCharacteristic = char;

    currentState = {
      connected: true,
      connecting: false,
      deviceName: device.name || 'Printer Bluetooth',
      deviceId: device.id,
      error: null,
    };
    notifyListeners();

    // Simpan ke localStorage nama printer terakhir yang berhasil terhubung
    try {
      localStorage.setItem('series_last_bluetooth_printer', JSON.stringify({
        id: device.id,
        name: device.name || 'Printer Bluetooth',
        connectedAt: new Date().toISOString()
      }));
    } catch {}

    return {
      name: device.name || 'Printer Bluetooth',
      id: device.id,
    };
  } catch (err: any) {
    activeDevice = null;
    activeCharacteristic = null;

    currentState = {
      connected: false,
      connecting: false,
      deviceName: null,
      deviceId: null,
      error: err.name === 'NotFoundError' ? null : (err.message || 'Gagal menghubungkan printer.'),
    };
    notifyListeners();

    throw err;
  }
}

/** Handler saat printer terputus (dimatikan / keluar jangkauan) */
function onDeviceDisconnected() {
  console.log('Bluetooth printer disconnected.');
  activeDevice = null;
  activeCharacteristic = null;
  currentState = {
    connected: false,
    connecting: false,
    deviceName: null,
    deviceId: null,
    error: null,
  };
  notifyListeners();
}

/** Putuskan koneksi Bluetooth secara manual */
export async function disconnectBluetoothPrinter(): Promise<void> {
  if (activeDevice && activeDevice.gatt) {
    try {
      if (activeDevice.gatt.connected) {
        activeDevice.gatt.disconnect();
      }
    } catch (e) {
      console.warn('Error during disconnect:', e);
    }
  }
  activeDevice = null;
  activeCharacteristic = null;
  currentState = {
    connected: false,
    connecting: false,
    deviceName: null,
    deviceId: null,
    error: null,
  };
  notifyListeners();
}

/**
 * Kirim data biner ESC/POS ke printer thermal via Bluetooth BLE.
 * Dilengkapi pembagian buffer (chunking) 100 bytes agar tidak membebani buffer mikro printer.
 */
export async function printViaBluetooth(data: Uint8Array): Promise<void> {
  if (!activeCharacteristic || !activeDevice || !activeDevice.gatt?.connected) {
    // Coba hubungkan ulang jika device masih ada
    if (activeDevice && activeDevice.gatt) {
      try {
        const server = await activeDevice.gatt.connect();
        activeCharacteristic = await findWriteCharacteristic(server);
        currentState.connected = true;
        notifyListeners();
      } catch {
        throw new Error('Printer Bluetooth belum terhubung. Silakan klik "Hubungkan Printer" terlebih dahulu.');
      }
    } else {
      throw new Error('Printer Bluetooth belum terhubung. Silakan hubungkan printer di menu Pengaturan Printer.');
    }
  }

  // Ukuran chunk (100 byte per paket merupakan angka optimal dan aman untuk printer thermal BLE)
  const CHUNK_SIZE = 100;
  const totalLength = data.length;
  const canWriteWithoutResponse = Boolean(activeCharacteristic.properties.writeWithoutResponse);

  for (let offset = 0; offset < totalLength; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);

    try {
      if (canWriteWithoutResponse && typeof activeCharacteristic.writeValueWithoutResponse === 'function') {
        await activeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await activeCharacteristic.writeValue(chunk);
      }
    } catch (err: any) {
      // Fallback jika writeWithoutResponse gagal pada firmware printer tertentu
      try {
        await activeCharacteristic.writeValue(chunk);
      } catch (innerErr: any) {
        throw new Error(`Gagal mengirim data ke printer: ${innerErr.message || err.message}`);
      }
    }

    // Jeda sejenak (20ms) agar buffer penerimaan chip BLE printer tidak meluap (overflow)
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

