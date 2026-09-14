'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { writeUtmParamsToSessionStorage } from './web/utils.ts';
import { TrackingService } from './tracking/TrackingService.ts';
import { WebMixpanelEvent, WebMixpanelPageViewEvent } from './types/webTypes.ts';
import { MobileMixpanelEvent, MobileMixpanelPageViewEvent } from './types/mobileTypes.ts';

export interface MixpanelContextProps {
  trackEvent: (event: WebMixpanelEvent | MobileMixpanelEvent) => void;
  trackPageView: (event: WebMixpanelPageViewEvent | MobileMixpanelPageViewEvent) => void;
  setEventContext: (context: WebMixpanelEvent['context'] | MobileMixpanelEvent['context']) => void;
}

export interface MixpanelProviderProps {
  /**
   * Children to render
   */
  children: React.ReactNode;
  /**
   * Tracking service to use included in this package are `WebTrackingService` and `MobileTrackingService`
   * @see WebTrackingService use for web applications
   * @see MobileTrackingService use for mobile applications, NOTE: set disableSessionStorage to true to disable session storage because it is not available in mobile
   *
   * if you want to use your own tracking service you can implement the `TrackingService` interface
   * @see TrackingService
   *
   */
  trackingService: TrackingService;
  /**
   * Default event context to use for all events
   * @see WebMixpanelEvent for web events
   * @see MobileMixpanelEvent for mobile events
   */
  defaultEventContext?: WebMixpanelEvent['context'] | MobileMixpanelEvent['context'];
  /**
   * Disables session storage for storing utm params
   */
  disableSessionStorage?: boolean;
}

const MixpanelContext = createContext<MixpanelContextProps | null>(null);

export function useMixpanelContext() {
  const context = useContext(MixpanelContext);

  if (!context) {
    throw new Error('<MixpanelProvider /> not found');
  }

  return context;
}

export function MixpanelProvider({
  children,
  trackingService,
  defaultEventContext,
  disableSessionStorage = false,
}: MixpanelProviderProps) {
  const [eventContext, setEventContext] = useState<WebMixpanelEvent['context'] | MobileMixpanelEvent['context']>(
    defaultEventContext || {},
  );

  const trackEvent = useCallback(
    (event: WebMixpanelEvent | MobileMixpanelEvent) => {
      trackingService.trackEvent({
        ...event,
        context: {
          ...eventContext,
          ...event.context,
        },
      });
    },
    [trackingService, eventContext],
  );

  const trackPageView = useCallback(
    (event: WebMixpanelPageViewEvent | MobileMixpanelPageViewEvent) => {
      trackingService.trackPageView({
        ...event,
        context: {
          ...eventContext,
          ...event.context,
        },
      });
    },
    [trackingService, eventContext],
  );

  useEffect(() => {
    if (disableSessionStorage) {
      return;
    }

    writeUtmParamsToSessionStorage(window.location.search);
  }, [disableSessionStorage]);

  return (
    <MixpanelContext.Provider
      value={{
        trackEvent,
        trackPageView,
        setEventContext,
      }}
    >
      {children}
    </MixpanelContext.Provider>
  );
}
