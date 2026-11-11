import Script from "next/script";
import { isTawkConfigured } from "@/lib/tawk-config";

// Public property + widget IDs from the Tawk.to embed snippet. Both must be
// set or the chat bubble stays off — same pattern as PostHog in
// instrumentation-client.ts. The IDs are not secrets (they ship to the
// browser), but they live in env so staging can omit or swap them.
const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim();
const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim();

/** Below Ask Astra (z-30) and modals so the product FAB wins hit-testing. */
const TAWK_Z_INDEX = 20;

export function TawkTo() {
  if (!isTawkConfigured() || !propertyId || !widgetId) return null;

  return (
    <Script id="tawk-to" strategy="lazyOnload">{`
      var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
      Tawk_API.customStyle={zIndex:${TAWK_Z_INDEX}};
      Tawk_API.onLoad=function(){
        window.__tawkReady=true;
        window.dispatchEvent(new Event("tawk:load"));
      };
      (function(){
      var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
      s1.async=true;
      s1.src='https://embed.tawk.to/${propertyId}/${widgetId}';
      s1.charset='UTF-8';
      s1.setAttribute('crossorigin','*');
      s0.parentNode.insertBefore(s1,s0);
      })();
    `}</Script>
  );
}
