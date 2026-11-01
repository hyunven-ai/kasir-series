// ESC/POS Command Generator for Thermal Printers (58mm & 80mm)
// Pure TypeScript implementation without external dependencies

export interface ReceiptItem {
  nama_barang: string;
  qty: number;
  harga_jual: number;
  kategori?: string;
  code?: string;
}

export interface ReceiptData {
  invoiceNo: string;
  customer: string;
  tanggalPenjualan: string;
  metodePembayaran?: string;
  items: ReceiptItem[];
  total: number;
  bayar?: number;
  invoiceIndex?: number;
}

export interface EscPosOptions {
  paperWidth?: '58mm' | '80mm';
  shopName?: string;
  addressLine1?: string;
  addressLine2?: string;
  whatsappNumber?: string;
  showSocialMedia?: boolean;
  facebookName?: string;
  instagramName?: string;
  tiktokName?: string;
  showImei?: boolean;
  warningNote?: string;
  footerNote?: string;
  printCopies?: number;
}

export class EscPosBuilder {
  private buffers: number[] = [];
  private encoder: TextEncoder;

  constructor() {
    this.encoder = new TextEncoder();
  }

  /** Inisialisasi printer & reset setting */
  init(): this {
    this.buffers.push(0x1b, 0x40); // ESC @
    return this;
  }

  /** Set Text Alignment */
  align(alignment: 'left' | 'center' | 'right'): this {
    const val = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffers.push(0x1b, 0x61, val); // ESC a n
    return this;
  }

  /** Bold on/off */
  bold(enable: boolean): this {
    this.buffers.push(0x1b, 0x45, enable ? 1 : 0); // ESC E n
    return this;
  }

  /** Underline on/off */
  underline(enable: boolean): this {
    this.buffers.push(0x1b, 0x2d, enable ? 1 : 0); // ESC - n
    return this;
  }

  /** Double Height & Width (Font size) */
  size(widthMultiplier: 1 | 2 = 1, heightMultiplier: 1 | 2 = 1): this {
    let n = 0;
    if (widthMultiplier === 2) n |= 0x10;
    if (heightMultiplier === 2) n |= 0x01;
    this.buffers.push(0x1d, 0x21, n); // GS ! n
    return this;
  }

  /** Tulis teks mentah dengan encoding ASCII/UTF-8 */
  rawText(str: string): this {
    if (!str) return this;
    // Bersihkan karakter anomali agar kompatibel dengan printer mikro thermal
    const cleanStr = str
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, '-')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');

    const bytes = this.encoder.encode(cleanStr);
    for (let i = 0; i < bytes.length; i++) {
      this.buffers.push(bytes[i]);
    }
    return this;
  }

  /** Tulis baris teks diakhiri enter */
  textLine(str: string = ''): this {
    this.rawText(str);
    this.newLine();
    return this;
  }

  /** Enter baru */
  newLine(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffers.push(0x0a); // LF
    }
    return this;
  }

  /** Garis pembatas (misal: '--------------------------------') */
  divider(char: string = '-', width: number = 32): this {
    this.rawText(char.repeat(width));
    this.newLine();
    return this;
  }

  /** Format dua kolom (rata kiri & rata kanan) persis selebar kertas */
  twoColumns(left: string, right: string, width: number = 32): this {
    const cleanLeft = left.trim();
    const cleanRight = right.trim();

    if (cleanLeft.length + cleanRight.length + 1 > width) {
      // Jika teks kiri terlalu panjang, cetak teks kiri dulu lalu baris berikutnya teks kanan rata kanan
      this.rawText(cleanLeft);
      this.newLine();
      const padding = Math.max(0, width - cleanRight.length);
      this.rawText(' '.repeat(padding) + cleanRight);
      this.newLine();
    } else {
      const spaceCount = width - cleanLeft.length - cleanRight.length;
      this.rawText(cleanLeft + ' '.repeat(Math.max(1, spaceCount)) + cleanRight);
      this.newLine();
    }
    return this;
  }

  /** Majukan kertas sejumlah baris */
  feed(lines: number = 3): this {
    this.buffers.push(0x1b, 0x64, lines); // ESC d n
    return this;
  }

  /** Potong kertas otomatis (jika didukung printer cutter) */
  cut(): this {
    this.buffers.push(0x1d, 0x56, 0x42, 0x00); // GS V 66 0 (partial cut)
    return this;
  }

  /** Buka laci kasir (Cash Drawer pulse) */
  openCashDrawer(): this {
    this.buffers.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // ESC p 0 25 250
    return this;
  }

  /** Dapatkan buffer Uint8Array final */
  build(): Uint8Array {
    return new Uint8Array(this.buffers);
  }
}

/**
 * Format tanggal dan jam singkat untuk struk kasir ESC/POS
 */
function formatReceiptDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return isoString;
  }
}

/**
 * Kompilasi data transaksi penjualan menjadi biner ESC/POS
 */
export function buildReceiptEscPos(
  data: ReceiptData,
  options: EscPosOptions = {}
): Uint8Array {
  const width = options.paperWidth === '80mm' ? 48 : 32;
  const builder = new EscPosBuilder();

  builder.init();

  // 1. HEADER TOKO
  builder.align('center');
  if (options.shopName) {
    builder.bold(true).size(2, 2);
    builder.textLine(options.shopName.toUpperCase());
    builder.size(1, 1).bold(false);
  } else {
    builder.bold(true).size(2, 2);
    builder.textLine('SERIES PONSEL');
    builder.size(1, 1).bold(false);
  }

  if (options.addressLine1) {
    builder.textLine(options.addressLine1);
  }
  if (options.addressLine2) {
    builder.textLine(options.addressLine2);
  }

  if (options.whatsappNumber) {
    builder.bold(true);
    builder.textLine(`WA: ${options.whatsappNumber}`);
    builder.bold(false);
  }

  if (options.showSocialMedia) {
    if (options.facebookName) {
      const fbLines = options.facebookName.split('\n');
      fbLines.forEach(line => {
        if (line.trim()) builder.textLine(`FB: ${line.trim()}`);
      });
    }
    if (options.instagramName) {
      builder.textLine(`IG: @${options.instagramName.replace(/^@/, '')}`);
    }
    if (options.tiktokName) {
      builder.textLine(`TikTok: ${options.tiktokName}`);
    }
  }

  builder.newLine();

  // 2. METADATA TRANSAKSI
  builder.align('left');
  builder.divider('-', width);

  const displayIndex = data.invoiceIndex !== undefined
    ? `#${data.invoiceIndex}`
    : data.invoiceNo
      ? `#${data.invoiceNo.split('/').pop()?.replace(/^0+/, '') || data.invoiceNo}`
      : '';

  const dateFormatted = formatReceiptDate(data.tanggalPenjualan);
  builder.twoColumns(dateFormatted, displayIndex, width);
  builder.textLine(`Pembeli: ${data.customer || 'Umum'}`);
  builder.divider('-', width);

  // 3. DAFTAR BARANG (ITEMS)
  let totalQty = 0;
  data.items.forEach((item, idx) => {
    totalQty += item.qty;
    const cleanName = item.nama_barang.replace(/\s*\(Non Pajak\)/gi, '').trim();
    builder.textLine(`${idx + 1}. ${cleanName}`);

    // Tampilkan IMEI jika ada dan pengaturan showImei aktif
    if (options.showImei && (item.kategori === 'HP' || item.kategori === 'HP Non Pajak') && item.code) {
      builder.bold(true);
      builder.textLine(`   IMEI: ${item.code}`);
      builder.bold(false);
    }

    const qtyPrice = `   ${item.qty}x ${item.harga_jual.toLocaleString('id-ID')}`;
    const subtotal = (item.qty * item.harga_jual).toLocaleString('id-ID');
    builder.twoColumns(qtyPrice, subtotal, width);
  });

  builder.divider('-', width);

  // 4. RINGKASAN PRODUK
  builder.twoColumns(`Produk: ${data.items.length}`, `Item: ${totalQty}`, width);
  builder.divider('-', width);

  // 5. TOTAL & PEMBAYARAN
  builder.bold(true);
  builder.twoColumns('TOTAL', `Rp ${data.total.toLocaleString('id-ID')}`, width);
  builder.bold(false);

  const cleanBayar = data.bayar !== undefined ? data.bayar : data.total;
  const metode = data.metodePembayaran || 'Tunai';
  builder.twoColumns(metode, `Rp ${cleanBayar.toLocaleString('id-ID')}`, width);

  const kembalian = cleanBayar - data.total;
  if (metode === 'Tunai' && kembalian > 0) {
    builder.twoColumns('Kembalian', `Rp ${kembalian.toLocaleString('id-ID')}`, width);
  }

  // 6. CATATAN & FOOTER
  builder.newLine();
  builder.align('center');

  if (options.warningNote) {
    builder.bold(true);
    builder.divider('*', width);
    builder.textLine(options.warningNote);
    builder.divider('*', width);
    builder.bold(false);
  }

  if (options.footerNote) {
    builder.newLine();
    builder.textLine(options.footerNote);
  }

  // 7. FEED & CUT
  builder.feed(4);
  builder.cut();

  return builder.build();
}

/**
 * Struk Tes Pencetakan Native ESC/POS
 */
export function buildTestReceiptEscPos(
  deviceName: string = 'Thermal Printer',
  paperWidth: '58mm' | '80mm' = '58mm',
  connectionMode: string = 'Bluetooth BLE'
): Uint8Array {
  const width = paperWidth === '80mm' ? 48 : 32;
  const builder = new EscPosBuilder();

  builder.init();
  builder.align('center');
  builder.bold(true).size(2, 2);
  builder.textLine('SERIES PONSEL');
  builder.size(1, 1).bold(false);
  builder.textLine('Sungai Pinyuh - Kalimantan Barat');
  builder.newLine();

  builder.bold(true);
  builder.textLine('*** TES CETAK NATIVE ESC/POS ***');
  builder.bold(false);
  builder.divider('=', width);

  builder.align('left');
  builder.twoColumns('Printer:', deviceName, width);
  builder.twoColumns('Koneksi:', connectionMode, width);
  builder.twoColumns('Lebar Kertas:', paperWidth, width);
  builder.twoColumns('Waktu Tes:', formatReceiptDate(new Date().toISOString()), width);
  builder.divider('-', width);

  builder.textLine('Tes Format Teks:');
  builder.textLine('1. Teks Biasa Standard Font');
  builder.bold(true);
  builder.textLine('2. Teks Tebal (Bold)');
  builder.bold(false);
  builder.underline(true);
  builder.textLine('3. Teks Bergaris Bawah');
  builder.underline(false);

  builder.divider('-', width);
  builder.align('center');
  builder.bold(true);
  builder.textLine('STATUS: TERHUBUNG SUKSES!');
  builder.textLine('KASIR SIAP MENCETAK OTOMATIS');
  builder.bold(false);
  builder.divider('=', width);

  builder.feed(4);
  builder.cut();

  return builder.build();
}

