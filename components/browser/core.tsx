"use client";

import igv from "./igv.mjs";
import React, { forwardRef, useEffect, useRef } from "react";

export type IGVBrowserInstance = Awaited<
  ReturnType<(typeof igv)["createBrowser"]>
>;

import { useMergeRefs } from "@floating-ui/react";

export default function IGV({
  igvRef,
}: {
  igvRef: React.Ref<IGVBrowserInstance>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const browserRef = useRef<WeakSet<IGVBrowserInstance>>(null);
  // if (!browserRef.current) {
  //   // @ts-ignore
  //   browserRef.current = new WeakSet();
  // }
  const ref = useMergeRefs([igvRef]);
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const browserPromise: Promise<IGVBrowserInstance> & { cancenled?: true } =
      igv.createBrowser(container, { genome: "hg38" });
    browserPromise.then((browser) => {
      if (browserPromise.cancenled) {
        console.log("Browser ready, but canceled");
      } else {
        console.log("Browser ready");
        ref?.(browser);
      }
    });
    return () => {
      console.log("cleanup");
      browserPromise.cancenled = true;
      browserPromise.then((browser) => {
        igv.removeBrowser(browser);
      })
      ref?.(null);
    };
  }, [ref]);
  return <div id="igv-browser" ref={containerRef}></div>;
}
