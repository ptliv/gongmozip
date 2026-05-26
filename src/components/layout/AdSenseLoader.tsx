"use client";

import { useEffect } from "react";

const ADSENSE_SCRIPT_ID = "gongmozip-adsense";
const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7242419267984081";

export function AdSenseLoader() {
  useEffect(() => {
    if (document.getElementById(ADSENSE_SCRIPT_ID)) return;

    let loaded = false;
    let delayId: number | undefined;

    const inject = () => {
      if (loaded || document.getElementById(ADSENSE_SCRIPT_ID)) return;
      loaded = true;

      const script = document.createElement("script");
      script.id = ADSENSE_SCRIPT_ID;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = ADSENSE_SRC;
      document.body.appendChild(script);
    };

    const schedule = () => {
      delayId = window.setTimeout(inject, 60000);
    };

    const onUserIntent = () => inject();

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    window.addEventListener("pointerdown", onUserIntent, { once: true, passive: true });
    window.addEventListener("keydown", onUserIntent, { once: true });
    window.addEventListener("scroll", onUserIntent, { once: true, passive: true });

    return () => {
      if (delayId) window.clearTimeout(delayId);
      window.removeEventListener("load", schedule);
      window.removeEventListener("pointerdown", onUserIntent);
      window.removeEventListener("keydown", onUserIntent);
      window.removeEventListener("scroll", onUserIntent);
    };
  }, []);

  return null;
}
