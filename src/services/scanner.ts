export type ScannerMode = 'keyboard' | 'hid' | 'serial' | 'manual';

type ScanCallback = (value: string) => void;

export interface ScannerSupportedApis {
  keyboardWedge: boolean;
  hid: boolean;
  serial: boolean;
  usb: boolean;
}

export interface ScannerCapability {
  mode: ScannerMode;
  supportedApis: ScannerSupportedApis;
  preferredMode: ScannerMode;
  message: string;
  needsConnection: boolean;
}

export interface ScannerStreamOptions {
  mode: ScannerMode;
  serialBaudRate?: number;
  serialDelimiter?: string | RegExp;
}

const isBrowser = typeof window !== 'undefined';
const textDecoder = new TextDecoder();

let selectedHidDevice: HIDDevice | null = null;
let selectedSerialPort: SerialPort | null = null;

let streamCleanup: (() => Promise<void> | void) | null = null;
let hidBuffer = '';
let serialBuffer = '';

const canUseKeyboardWedge = () => {
  if (!isBrowser || typeof document === 'undefined') {
    return false;
  }

  return typeof document.createElement === 'function';
};

const emitFrames = (
  chunk: string,
  buffer: string,
  onScan: ScanCallback,
  delimiter: string | RegExp,
): string => {
  const normalizedChunk = chunk.replace(/\u0000/g, '\n');
  const combined = `${buffer}${normalizedChunk}`;

  if (typeof delimiter === 'string') {
    const parts = combined.split(delimiter);
    const remainder = parts.pop() ?? '';
    parts
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((frame) => onScan(frame));
    return remainder;
  }

  const parts = combined.split(delimiter);
  const remainder = parts.pop() ?? '';
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((frame) => onScan(frame));
  return remainder;
};

export const detectScannerCapability = async (): Promise<ScannerCapability> => {
  const keyboardWedge = canUseKeyboardWedge();

  const nav = isBrowser ? navigator : undefined;
  const hid = Boolean(nav && 'hid' in nav);
  const serial = Boolean(nav && 'serial' in nav);
  const usb = false;

  let mode: ScannerMode = keyboardWedge ? 'keyboard' : 'manual';
  let preferredMode: ScannerMode = keyboardWedge ? 'keyboard' : 'manual';

  if (hid) {
    preferredMode = 'hid';
  } else if (serial) {
    preferredMode = 'serial';
  }

  if (!keyboardWedge && (hid || serial)) {
    mode = preferredMode;
  }

  const hasScannerApiAccess = hid || serial;

  return {
    mode,
    preferredMode,
    supportedApis: {
      keyboardWedge,
      hid,
      serial,
      usb,
    },
    needsConnection: hid || serial,
    message: hasScannerApiAccess
      ? 'Scanner APIs available (keyboard wedge fallback active)'
      : 'No scanner API access; manual typing mode',
  };
};

export const requestScannerConnection = async (
  capability: ScannerCapability,
): Promise<ScannerMode> => {
  if (!isBrowser) {
    return capability.mode;
  }

  if (capability.supportedApis.hid && 'hid' in navigator) {
    const devices = await navigator.hid.requestDevice({ filters: [] });
    if (devices.length > 0) {
      selectedHidDevice = devices[0];
      return 'hid';
    }
  }

  if (capability.supportedApis.serial && 'serial' in navigator) {
    selectedSerialPort = await navigator.serial.requestPort({ filters: [] });
    return 'serial';
  }

  return capability.mode;
};

const startHidStream = async (onScan: ScanCallback): Promise<() => Promise<void>> => {
  if (!selectedHidDevice) {
    throw new Error('No HID scanner selected. Connect a scanner first.');
  }

  if (!selectedHidDevice.opened) {
    await selectedHidDevice.open();
  }

  hidBuffer = '';

  const onInputReport = (event: HIDInputReportEvent) => {
    const bytes = new Uint8Array(event.data.buffer);
    const text = textDecoder.decode(bytes);
    hidBuffer = emitFrames(text, hidBuffer, onScan, /\r?\n|\t+/);
  };

  selectedHidDevice.addEventListener('inputreport', onInputReport);

  return async () => {
    selectedHidDevice?.removeEventListener('inputreport', onInputReport);
  };
};

const startSerialStream = async (
  onScan: ScanCallback,
  baudRate: number,
  delimiter: string | RegExp,
): Promise<() => Promise<void>> => {
  if (!selectedSerialPort) {
    throw new Error('No serial scanner selected. Connect a scanner first.');
  }

  if (!selectedSerialPort.readable) {
    await selectedSerialPort.open({ baudRate });
  }

  const port = selectedSerialPort;
  const reader = port.readable?.getReader();

  if (!reader) {
    throw new Error('Unable to start serial scanner reader.');
  }

  let active = true;
  serialBuffer = '';

  const readLoop = (async () => {
    while (active) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      const text = textDecoder.decode(value, { stream: true });
      serialBuffer = emitFrames(text, serialBuffer, onScan, delimiter);
    }
  })();

  return async () => {
    active = false;
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
    await readLoop.catch(() => undefined);
    if (port.readable) {
      await port.close().catch(() => undefined);
    }
  };
};

export const startScannerStream = async (
  onScan: ScanCallback,
  options: ScannerStreamOptions,
): Promise<void> => {
  await stopScannerStream();

  if (options.mode === 'keyboard' || options.mode === 'manual') {
    return;
  }

  if (options.mode === 'hid') {
    streamCleanup = await startHidStream(onScan);
    return;
  }

  if (options.mode === 'serial') {
    const delimiter = options.serialDelimiter ?? /\r?\n/;
    const baudRate = options.serialBaudRate ?? 9600;
    streamCleanup = await startSerialStream(onScan, baudRate, delimiter);
  }
};

export const stopScannerStream = async (): Promise<void> => {
  if (!streamCleanup) {
    return;
  }

  await streamCleanup();
  streamCleanup = null;
};
