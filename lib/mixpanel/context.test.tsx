// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck test file contains web apis that are not available in node environment for typescript

import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, renderHook, RenderOptions } from '@testing-library/react';
import React, { useEffect } from 'react';
import { MixpanelProvider, useMixpanelContext } from './context.tsx';
import { WebTrackingService } from './tracking/WebTrackingService.ts';

describe('MixpanelContext', () => {
  const eventApiClient = vi.fn(() => Promise.resolve());

  const ContextWrapper = ({
    children,
    defaultEventContext,
  }: {
    children: React.ReactNode;
    defaultEventContext: MixpanelEvent;
  }) => (
    <MixpanelProvider
      trackingService={new WebTrackingService(eventApiClient)}
      defaultEventContext={defaultEventContext}
    >
      {children}
    </MixpanelProvider>
  );

  const renderWithMixpanelProvider = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
    return render(ui, {
      wrapper: (props) => <ContextWrapper {...props} {...options?.contextWrapperProps} />,
      ...options?.testingLibraryOptions,
    });
  };

  function TrackEventTestingComponent({ defaultEventContext }: { defaultEventContext?: MixpanelEvent['context'] }) {
    const { trackEvent, setEventContext } = useMixpanelContext();

    useEffect(() => {
      if (defaultEventContext) {
        setEventContext(defaultEventContext);
      }
    }, [defaultEventContext]);

    return (
      <button
        onClick={() =>
          trackEvent({
            name: 'event name',
            context: { title: 'Page title' },
            data: { productId: '123' },
          })
        }
      >
        button
      </button>
    );
  }

  function TrackPageView() {
    const { trackPageView } = useMixpanelContext();

    useEffect(() => {
      trackPageView({
        data: {
          title: 'Example',
          pathname: '/product/1',
          route: '/product/:id',
        },
      });
    }, []);

    return null;
  }

  test('provides expected context with trackEvent function', () => {
    const { result } = renderHook(() => useMixpanelContext(), {
      wrapper: ContextWrapper,
    });

    expect(result.current).toHaveProperty('trackEvent');
    expect(typeof result.current.trackEvent).toBe('function');

    expect(result.current).toHaveProperty('trackPageView');
    expect(typeof result.current.trackPageView).toBe('function');
  });

  test('trackEvent sends correct data to api client', () => {
    const { getByText } = renderWithMixpanelProvider(<TrackEventTestingComponent />);

    fireEvent.click(getByText('button'));

    expect(eventApiClient).toHaveBeenCalledWith({
      name: 'event name',
      context: {
        title: 'Page title',
        pathname: '/',
        pwa: false,
      },
      data: {
        productId: '123',
      },
    });
  });

  test('provider can extend the default context for event tracking with provider prop', () => {
    const defaultEventContext = {
      href: 'https://example.com',
      pathname: '/example',
      audience: 'Consumer',
    };

    const { getByText } = renderWithMixpanelProvider(<TrackEventTestingComponent />, {
      contextWrapperProps: { defaultEventContext },
    });

    fireEvent.click(getByText('button'));

    expect(eventApiClient).toHaveBeenCalledWith({
      name: 'event name',
      context: {
        title: 'Page title',
        href: 'https://example.com',
        pathname: '/example',
        pwa: false,
        audience: 'Consumer',
      },
      data: {
        productId: '123',
      },
    });
  });

  test('Default event context can be extended from a child component', () => {
    const defaultEventContext = {
      href: 'https://example.com',
      pathname: '/example',
      audience: 'Consumer',
    };

    const { getByText } = renderWithMixpanelProvider(
      <TrackEventTestingComponent defaultEventContext={defaultEventContext} />,
    );

    fireEvent.click(getByText('button'));

    expect(eventApiClient).toHaveBeenCalledWith({
      name: 'event name',
      context: {
        title: 'Page title',
        href: 'https://example.com',
        pathname: '/example',
        pwa: false,
        audience: 'Consumer',
      },
      data: {
        productId: '123',
      },
    });
  });

  test('trackPageView sends correct data to api client', () => {
    renderWithMixpanelProvider(<TrackPageView />);

    expect(eventApiClient).toHaveBeenCalledWith({
      name: 'Page view',
      context: {
        pwa: false,
      },
      data: {
        title: 'Example',
        pathname: '/product/1',
        route: '/product/:id',
      },
    });
  });

  test('provider can extend the default context for page view tracking with provider prop', () => {
    const defaultEventContext = {
      audience: 'Consumer',
    };

    renderWithMixpanelProvider(<TrackPageView />, {
      contextWrapperProps: { defaultEventContext },
    });

    expect(eventApiClient).toHaveBeenCalledWith({
      name: 'Page view',
      context: {
        pwa: false,
        audience: 'Consumer',
      },
      data: {
        title: 'Example',
        pathname: '/product/1',
        route: '/product/:id',
      },
    });
  });
});
