import { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import type { ScannerMode, ScannerCapability } from '../services/scanner';
import { detectScannerCapability, startScannerStream, stopScannerStream, requestScannerConnection } from '../services/scanner';

export interface ScanHandler {
  id: string;
  handler: (barcode: string) => void;
  priority: number;
}

interface ScannerContextType {
  capability: ScannerCapability | null;
  isConnected: boolean;
  activeMode: ScannerMode;
  isConnecting: boolean;
  registerHandler: (handler: ScanHandler) => void;
  unregisterHandler: (id: string) => void;
  refreshCapability: () => Promise<void>;
  connectScanner: () => Promise<void>;
}

const ScannerContext = createContext<ScannerContextType | null>(null);

export function ScannerProvider({ children }: { children: React.ReactNode }) {
  const [capability, setCapability] = useState<ScannerCapability | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeMode, setActiveMode] = useState<ScannerMode>('keyboard');
  const [isConnecting, setIsConnecting] = useState(false);
  const handlersRef = useRef<Map<string, ScanHandler>>(new Map());

  const getActiveHandler = useCallback(() => {
    const handlers = Array.from(handlersRef.current.values());
    if (handlers.length === 0) return null;
    return handlers.reduce((prev, current) => {
      return current.priority > prev.priority ? current : prev;
    });
  }, []);

  const handleScannedCode = useCallback((barcode: string) => {
    const activeHandler = getActiveHandler();
    if (activeHandler) {
      activeHandler.handler(barcode);
    }
  }, [getActiveHandler]);

  const registerHandler = useCallback((handler: ScanHandler) => {
    handlersRef.current.set(handler.id, handler);
  }, []);

  const unregisterHandler = useCallback((id: string) => {
    handlersRef.current.delete(id);
  }, []);

  const refreshCapability = useCallback(async () => {
    const cap = await detectScannerCapability();
    setCapability(cap);
    setActiveMode(cap.mode);
    setIsConnected(['hid', 'serial', 'usb'].includes(cap.mode));
  }, []);

  const connectScanner = useCallback(async () => {
    if (!capability) return;

    setIsConnecting(true);
    try {
      const mode = await requestScannerConnection(capability);
      setActiveMode(mode);
      setIsConnected(['hid', 'serial', 'usb'].includes(mode));
    } finally {
      setIsConnecting(false);
    }
  }, [capability]);

  // Initialize capability on mount
  useEffect(() => {
    void refreshCapability();
  }, [refreshCapability]);

  // Manage scanner stream based on mode and active handlers
  useEffect(() => {
    if (activeMode !== 'hid' && activeMode !== 'serial') {
      void stopScannerStream();
      return;
    }

    let isMounted = true;

    const startStream = async () => {
      try {
        await startScannerStream(handleScannedCode, {
          mode: activeMode,
          serialBaudRate: 9600,
        });
      } catch (error) {
        if (!isMounted) return;

        setActiveMode('keyboard');
        setIsConnected(false);
      }
    };

    void startStream();

    return () => {
      isMounted = false;
      void stopScannerStream();
    };
  }, [activeMode, handleScannedCode]);

  const value: ScannerContextType = {
    capability,
    isConnected,
    activeMode,
    isConnecting,
    registerHandler,
    unregisterHandler,
    refreshCapability,
    connectScanner,
  };

  return <ScannerContext.Provider value={value}>{children}</ScannerContext.Provider>;
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (!context) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
}
