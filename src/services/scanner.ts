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
  const message = hasScannerApiAccess
    ? 'Scanner APIs available; connect required'
    : keyboardWedge
      ? 'Scanner APIs unavailable; keyboard wedge ready'
      : 'No scanner APIs available; manual typing mode';

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
    message,
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

// Keyboard-wedge scanners "type" the barcode followed by Enter, much faster than a person.
// This listens on the whole window so a scan works without any input being focused.
// Fields marked with data-scanner-input handle scans themselves and are left alone. If the
// scan landed in some other text field, the typed barcode is removed from it again.
export const SCANNER_INPUT_ATTR = 'data-scanner-input';

const WEDGE_MAX_KEY_INTERVAL_MS = (() => {
  const parsed = Number.parseInt(import.meta.env.VITE_SCAN_BURST_MAX_INTERVAL_MS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
})();
const WEDGE_MIN_LENGTH = 4;
const IGNORED_KEYS = new Set(['Shift', 'CapsLock']);

const removeTypedSuffix = (el: Element | null, code: string) => {
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;
  if (!el.value.endsWith(code)) return;
  // Use the native setter + an input event so React's controlled state sees the change.
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, el.value.slice(0, -code.length));
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

export const startKeyboardWedge = (onScan: ScanCallback, shouldCapture: () => boolean) => {
  let buffer = '';
  let lastKeyTs = 0;

  const onKeyDown = (event: KeyboardEvent) => {
    if (IGNORED_KEYS.has(event.key)) return;
    const now = performance.now();
    const gap = now - lastKeyTs;
    lastKeyTs = now;

    const active = document.activeElement;
    if (event.ctrlKey || event.altKey || event.metaKey || active?.closest(`[${SCANNER_INPUT_ATTR}]`)) {
      buffer = '';
      return;
    }

    if (event.key === 'Enter') {
      const code = buffer;
      buffer = '';
      if (code.length >= WEDGE_MIN_LENGTH && gap <= WEDGE_MAX_KEY_INTERVAL_MS && shouldCapture()) {
        event.preventDefault();
        event.stopPropagation();
        removeTypedSuffix(active, code);
        onScan(code);
      }
      return;
    }

    if (event.key.length !== 1) {
      buffer = '';
      return;
    }
    if (gap > WEDGE_MAX_KEY_INTERVAL_MS) buffer = '';
    buffer += event.key;
  };

  window.addEventListener('keydown', onKeyDown, true);
  return () => window.removeEventListener('keydown', onKeyDown, true);
};
