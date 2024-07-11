"use client";

import igv from "./igv.mjs";
import React, {
  Component,
  createRef,
  forwardRef,
  useEffect,
  useRef,
} from "react";

export type IGVBrowserInstance = Awaited<
  ReturnType<(typeof igv)["createBrowser"]>
>;

function mergeRefs<T>(...refs: React.ForwardedRef<T>[]) {
  return (instance: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(instance);
      } else if (ref != null) {
        ref.current = instance;
      }
    });
  };
}

let didInited = new WeakSet<HTMLDivElement>();

const IGVBrowser = forwardRef<IGVBrowserInstance, {}>(function IGV(
  _,
  forwardedRef
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const browserRef = useRef<IGVBrowserInstance | null>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    if (didInited.has(container)) return;
    didInited.add(container);
    igv.createBrowser(container, { genome: "hg38" }).then((browser) => {
      if (!container.isConnected) {
        igv.removeBrowser(browser);
      } else {
        mergeRefs(forwardedRef, browserRef)(browser);
      }
    });
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      browserRef.current && igv.removeBrowser(browserRef.current);
      mergeRefs(forwardedRef, browserRef)(null);
    };
  }, [forwardedRef]);
  return <div id="igv-browser" ref={containerRef}></div>;
});

export default IGVBrowser;
