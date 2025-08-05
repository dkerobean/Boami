"use client";
import { persistor, store } from "./store";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { SessionProvider } from "next-auth/react";
import { LoadingProvider } from "@/app/components/shared/loading/LoadingProvider";

export function Providers({ children }: { children: any }) {
  return (
    <SessionProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <LoadingProvider
            config={{
              minDisplayTime: 300,
              maxDisplayTime: 5000,
              animationType: 'pulse',
              showLogo: false,
              showText: true,
              fadeOutDuration: 200,
              size: 'medium',
              color: 'primary'
            }}
          >
            {children}
          </LoadingProvider>
        </PersistGate>
      </Provider>
    </SessionProvider>
  );
}
