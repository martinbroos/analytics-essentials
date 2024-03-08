import React, { createContext, useContext } from 'react';
import { MixpanelEvent as DTO } from '../types';

interface MixpanelContextProps<DTO> {
    trackEvent: (event: DTO) => void;
}

interface MixpanelProviderProps<DTO> {
    children: React.ReactNode;
    eventApiClient: (args: DTO) => Promise<unknown>;
}

const MixpanelContext = createContext<MixpanelContextProps<DTO> | null>(null);

export function useMixpanelContext() {
    const context = useContext(MixpanelContext);

    if (!context) {
        throw new Error('<MixpanelProvider /> not found');
    }

    return context;
}

export function MixpanelProvider({
    children,
    eventApiClient,
}: MixpanelProviderProps<DTO>) {
    const trackEvent = (event: DTO) => {
        eventApiClient(event);
    };

    return (
        <MixpanelContext.Provider
            value={{
                trackEvent,
            }}
        >
            {children}
        </MixpanelContext.Provider>
    );
}
