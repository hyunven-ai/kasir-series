// WebUSB Manager for Thermal ESC/POS Printers (Direct OTG Cable)
// Allows direct high-speed ESC/POS data transfer over USB cable on Android tablets or PCs.

export interface UsbPrinterState {
  connected: boolean;
  connecting: boolean;
  deviceName: string | null;
  error: string | null;
}

let activeUsbDevice: any = null;
let outEndpointNumber: number | null = null;
let claimedInterfaceNumber: number | null = null;

let usbListeners: Array<(state: UsbPrinterState) => void> = [];
let currentUsbState: UsbPrinterState = {
  connected: false,
  connecting: false,
  deviceName: null,
  error: null,
};

function notifyUsbListeners() {
  usbListeners.forEach(listener => {
    try {
      listener({ ...currentUsbState });
    } catch (e) {
      console.error('Error in usb status listener:', e);
    }
  });
}

/** Periksa apakah browser mendukung WebUSB */
export function isWebUsbSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return Boolean((navigator as any).usb);
}

/** Subscribe ke perubahan status USB */
export function subscribeUsbStatus(listener: (state: UsbPrinterState) => void): () => void {
  usbListeners.push(listener);
  listener({ ...currentUsbState });
  return () => {
    usbListeners = usbListeners.filter(l => l !== listener);
  };
}

/** Dapatkan status koneksi WebUSB saat ini */
export function getUsbState(): UsbPrinterState {
  return { ...currentUsbState };
}

/**
 * Hubungkan ke printer thermal via kabel USB OTG
 */
export async function connectUsbPrinter(): Promise<{ name: string }> {
  if (!isWebUsbSupported()) {
    throw new Error('WebUSB tidak didukung di browser ini. Gunakan Google Chrome.');
  }

  if (activeUsbDevice && activeUsbDevice.opened && outEndpointNumber !== null) {
    return { name: activeUsbDevice.productName || 'Printer USB' };
  }

  currentUsbState = {
    ...currentUsbState,
    connecting: true,
    error: null,
  };
  notifyUsbListeners();

  try {
    // Cari perangkat USB (menerima printer classCode 7 atau vendor specific)
    const device = await (navigator as any).usb.requestDevice({
      filters: [
        { classCode: 7 }, // USB Printer Class
        { classCode: 255 }, // Vendor Specific Class (banyak dipakai printer mini thermal)
      ],
    });

    if (!device) {
      throw new Error('Tidak ada perangkat USB yang dipilih.');
    }

    await device.open();

    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Temukan interface dan endpoint OUT (Bulk OUT untuk kirim data struk)
    let foundInterface: number | null = null;
    let foundEndpoint: number | null = null;

    const configuration = device.configuration;
    for (const iface of configuration.interfaces) {
      for (const alternate of iface.alternates) {
        for (const endpoint of alternate.endpoints) {
          if (endpoint.direction === 'out') {
            foundInterface = iface.interfaceNumber;
            foundEndpoint = endpoint.endpointNumber;
            break;
          }
        }
        if (foundEndpoint !== null) break;
      }
      if (foundEndpoint !== null) break;
    }

    if (foundInterface === null || foundEndpoint === null) {
      throw new Error('Tidak ditemukan endpoint data OUT pada printer USB ini.');
    }

    await device.claimInterface(foundInterface);

    activeUsbDevice = device;
    claimedInterfaceNumber = foundInterface;
    outEndpointNumber = foundEndpoint;

    currentUsbState = {
      connected: true,
      connecting: false,
      deviceName: device.productName || 'Printer USB Thermal',
      error: null,
    };
    notifyUsbListeners();

    return { name: currentUsbState.deviceName || 'Printer USB' };
  } catch (err: any) {
    activeUsbDevice = null;
    claimedInterfaceNumber = null;
    outEndpointNumber = null;

    currentUsbState = {
      connected: false,
      connecting: false,
      deviceName: null,
      error: err.name === 'NotFoundError' ? null : (err.message || 'Gagal menghubungkan printer USB.'),
    };
    notifyUsbListeners();

    throw err;
  }
}

/** Putuskan koneksi USB */
export async function disconnectUsbPrinter(): Promise<void> {
  if (activeUsbDevice) {
    try {
      if (claimedInterfaceNumber !== null) {
        await activeUsbDevice.releaseInterface(claimedInterfaceNumber);
      }
      await activeUsbDevice.close();
    } catch (e) {
      console.warn('Error closing USB device:', e);
    }
  }

  activeUsbDevice = null;
  claimedInterfaceNumber = null;
  outEndpointNumber = null;

  currentUsbState = {
    connected: false,
    connecting: false,
    deviceName: null,
    error: null,
  };
  notifyUsbListeners();
}

/** Kirim data ESC/POS via WebUSB */
export async function printViaUsb(data: Uint8Array): Promise<void> {
  if (!activeUsbDevice || !activeUsbDevice.opened || outEndpointNumber === null) {
    throw new Error('Printer USB belum terhubung.');
  }

  const CHUNK_SIZE = 512;
  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);
    await activeUsbDevice.transferOut(outEndpointNumber, chunk);
  }
}

