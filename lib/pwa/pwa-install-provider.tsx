'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  dismissPwaInstallPromptPermanent,
  isPwaInstallDismissed,
} from '@/lib/pwa/install-storage';

export type InstallPlatform = 'chromium' | 'ios' | 'other';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type PwaInstallContextValue = {
  isInstalled: boolean;
  platform: InstallPlatform;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

const isDev = process.env.NODE_ENV === 'development';

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function detectPlatform(): InstallPlatform {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIos) return 'ios';
  return 'other';
}

function subscribeInstalled(onStoreChange: () => void): () => void {
  const standaloneMq = window.matchMedia('(display-mode: standalone)');
  const minimalMq = window.matchMedia('(display-mode: minimal-ui)');

  const onChange = () => onStoreChange();
  standaloneMq.addEventListener('change', onChange);
  minimalMq.addEventListener('change', onChange);
  window.addEventListener('appinstalled', onChange);

  return () => {
    standaloneMq.removeEventListener('change', onChange);
    minimalMq.removeEventListener('change', onChange);
    window.removeEventListener('appinstalled', onChange);
  };
}

function useIsInstalled(): boolean {
  return useSyncExternalStore(subscribeInstalled, detectInstalled, () => false);
}

function useDetectedPlatform(): InstallPlatform {
  return useSyncExternalStore(
    () => () => {},
    detectPlatform,
    () => 'other',
  );
}

/** Captures beforeinstallprompt and auto-opens the browser-native install UI on production. */
export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isInstalled = useIsInstalled();
  const detectedPlatform = useDetectedPlatform();
  const [chromiumOffered, setChromiumOffered] = useState(false);
  const autoPromptAttempted = useRef(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const isAdmin = pathname?.startsWith('/admin');
  const platform: InstallPlatform = chromiumOffered
    ? 'chromium'
    : detectedPlatform;

  const runNativePrompt = useCallback(async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return;

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        dismissPwaInstallPromptPermanent();
        deferredPromptRef.current = null;
      }
    } catch {
      // User dismissed or browser blocked the prompt.
    }
  }, []);

  const maybeAutoPrompt = useCallback(() => {
    if (
      isDev ||
      isAdmin ||
      isInstalled ||
      isPwaInstallDismissed() ||
      autoPromptAttempted.current ||
      !deferredPromptRef.current
    ) {
      return;
    }

    autoPromptAttempted.current = true;
    window.setTimeout(() => {
      void runNativePrompt();
    }, 1200);
  }, [isAdmin, isInstalled, runNativePrompt]);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      if (isDev) return;
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setChromiumOffered(true);
      maybeAutoPrompt();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, [maybeAutoPrompt]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({ isInstalled, platform }),
    [isInstalled, platform],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error('usePwaInstall must be used within PwaInstallProvider');
  }
  return ctx;
}
