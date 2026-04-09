export type ScannerMode = 'keyboard' | 'hid' | 'serial' | 'usb' | 'manual';

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

const isBrowser = typeof window !== 'undefined';

const canUseKeyboardWedge = () => {
  if (!isBrowser || typeof document === 'undefined') {
    return false;
  }

  return typeof document.createElement === 'function';
};

export const detectScannerCapability = async (): Promise<ScannerCapability> => {
  const keyboardWedge = canUseKeyboardWedge();

  const nav = isBrowser ? navigator : undefined;
  const hid = Boolean(nav && 'hid' in nav);
  const serial = Boolean(nav && 'serial' in nav);
  const usb = Boolean(nav && 'usb' in nav);

  let mode: ScannerMode = keyboardWedge ? 'keyboard' : 'manual';
  let preferredMode: ScannerMode = keyboardWedge ? 'keyboard' : 'manual';

  if (hid) {
    preferredMode = 'hid';
  } else if (serial) {
    preferredMode = 'serial';
  } else if (usb) {
    preferredMode = 'usb';
  }

  if (!keyboardWedge && (hid || serial || usb)) {
    mode = preferredMode;
  }

  const hasScannerApiAccess = hid || serial || usb;

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
      ? 'Scanner detected (keyboard input mode)'
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
      return 'hid';
    }
  }

  if (capability.supportedApis.serial && 'serial' in navigator) {
    await navigator.serial.requestPort({ filters: [] });
    return 'serial';
  }

  if (capability.supportedApis.usb && 'usb' in navigator) {
    await navigator.usb.requestDevice({ filters: [] });
    return 'usb';
  }

  return capability.mode;
};
