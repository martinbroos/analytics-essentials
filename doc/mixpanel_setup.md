# Mixpanel setup

## Introduction
This implementation of mixpanel relies on a backend service to send the data to mixpanel. The goal of the frontend lib is to provide a typechecked event to help developers push events the same way.
For the backend Freshheads created a php bundle, [FHMixpanelBundle](https://github.com/freshheads/FHMixpanelBundle) and a node library will also be created in the future.

## Usage

Add the MixpanelProvider to your app:

```tsx
import { MixpanelProvider, WebTrackingService } from "@freshheads/analytics-essentials";
import { useMemo } from "react";

const App = () => {
  const trackingService = useMemo(
    () =>
      new WebTrackingService((event) => {
        return sendTrackEvent(event);
      }),
    []
  );

  return (
    <MixpanelProvider trackingService={trackingService}>
      <YourApp />
    </MixpanelProvider>
  );
};
```
> Tip: memoize the WebTrackingService instance to prevent accidental page view triggers. If we'd instantiate it inline, we would trigger a page view whenever app rerenders (e.g. when the path, query params or hash changes)

`sendTrackEvent` is a function that sends the event to the backend. It should have the following signature:

```tsx

import { WebMixpanelEvent, WebMixpanelPageViewEvent } from '@freshheads/analytics-essentials';
import { executePostRequest } from '@/api/client';

export const sendTrackEvent = async (data: WebMixpanelEvent | WebMixpanelPageViewEvent) => {
    return executePostRequest('_mixpanel/track', data);
};
```

Then you can use the `useMixpanelContext` hook to send events:

```tsx
import { useMixpanelContext } from '@freshheads/analytics-essentials';

const { trackEvent } = useMixpanelContext();

trackEvent({
  name: 'Add to cart',
  data: {
    product_name: product.title,
  },
});
```

### Context and overrides
By default, each event will have a context property that contains more information about the page it was sent from.
This is resolved from window.location because we have no access to the router state.

```
{
    title: 'Product Page', // What page is the event triggered on
    pathname: '/product/123', // Make sure there aren't any personal info in the path
    href: 'https://www.example.com/product/123', // Make sure there aren't any personal info in the href
}
```

You can override this context by providing a `context` property to the event.

```tsx
trackEvent({
    name: 'Add to cart',
    context: {
        section: 'footer',
    },
});
```

Or by providing a default context to the MixpanelProvider:

```tsx
const router = useRouter();

const defaultMixpanelEventContext = {
    pathname: router.pathname,
    route: router.route,
    audience: 'Freelancer',
};

const App = () => {
  return (
    <MixpanelProvider 
        trackingService={trackingService} 
        defaultEventContext={defaultMixpanelEventContext}>
        <YourApp />
    </MixpanelProvider>
  );
};
```

Or by using setEventContext which is exposed by the useMixpanelContext hook. This would make sense if some data is not available in your root component.

```tsx
const { setEventContext } = useMixpanelContext();

useEffect(() => {
    setEventContext({
        audience: 'Consumer',
    });
}, []);
```


### Page view events

For page view events, you can use the `trackPageView` function.
First create a component that will be used to track page views.
The reason we don't make this part of the essential package is because we don't want to make any assumptions about the router you are using.
Or you might want to send additional data with the page view event.

```tsx
'use client';

import { useMixpanelContext } from '@freshheads/analytics-essentials';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export const TrackPageView = () => {
  const { trackPageView } = useMixpanelContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Reconstruct the full string path including query params if they exist
    const queryString = searchParams.toString();
    const fullRoute = queryString ? `${pathname}?${queryString}` : pathname;

    trackPageView({
      data: {
        title: document.title,
        pathname: pathname ?? '/',
        route: fullRoute,
      },
    });
  }, [trackPageView, pathname, searchParams]);

  return null;
};
```
> Tip: use pathname as a dependency for the useEffect hook. This way it will not trigger on query param changes. If you want to track query changes, you could use location.href as a dependency.

Then add this component to your app:

```tsx
const App = () => {
    return (
        <MixpanelProvider trackingService={trackingService}>
            <Suspense fallback={null}>
                <TrackPageView />
            </Suspense>
            {children}
        </MixpanelProvider>
    );
};
```
> In the App Router, using the useSearchParams() hook will force Next.js to drop out of static optimization for the entire route unless it is explicitly trapped inside a (Suspense) boundary. 

### UTM tracking

UTM tags are automatically added to the context of the event if they are present in the URL. 
They will be remembered for the duration of the session. Even if the user navigates to a different page, the UTM tags will be added to new events.

#### Mobile

On mobile, the UTM tags can not be stored in the session, use `disableSessionStorage` to disable this behaviour.

## Mixpanel users

Mixpanel events can be attached to a user. This is done in the backend on user login, see [FHMixpanelBundle](https://github.com/freshheads/FHMixpanelBundle) for more information.

### Reset user
The device_id is stored in a cookie, so when the user logs out, the cookie should be reset. 
Otherwise, when another user logs in on the same device, the device_id is linked to two users which is not allowed.

When using JWT tokens for authentication the token can become invalid at any time. This means that the user can become anonymous at any time.
When the user becomes anonymous, the frontend should also reset the user in mixpanel.

FHMixpanelBundle has an endpoint to do this reset user action. This library doesn't provide an implementation for it but could look like this:

```tsx
function resetMixpanelUser() {
    executeDeleteRequest('_mixpanel/transaction');
}
```

## Event naming conventions

Our advice is to use the following naming conventions for events:

1. Using present tense for events that are triggered by the user, and past tense for events that are triggered by the backend.
> e.g. 'Add to cart' instead of 'Added to cart'

> e.g. Action + what

2. Not using snake_case but use normal spaces for event names so it's easier to read in the mixpanel dashboard.
> e.g. 'Add to cart' instead of 'add_to_cart'

3. Grouping events by using context properties instead of adding them to the event name.
> e.g. 'Click button' with context { section: 'hero' } instead of 'Click hero button'

4. Using short and descriptive names.

