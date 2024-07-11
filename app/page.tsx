"use client";

import { IGVBrowserInstance } from "@/components/browser/core";
import { QueryContainer, Track, withQuery } from "@/components/query/container";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { toast } from "sonner";

import pLimit from "p-limit";
import { QueryContent } from "@/components/query/core";
import { parseRangeFromRegion } from "@/components/query/parse";

const limit = pLimit(8);

const IGVBrowser = dynamic(() => import("@/components/browser/core"), {
  ssr: false,
});

export default function Home() {
  const bamsRef = useRef<Track[]>([]);
  const browserRef = useRef<IGVBrowserInstance>(null);
  const queryRef = useRef<QueryContent | null>(null);
  const loadedTracksRef = useRef<Set<any>>(new Set());
  return (
    <main className="grid grid-cols-2">
      <QueryContainer
        onLoad={async (bams) => {
          queryRef.current = null;
          const browser = browserRef.current;
          if (!browser) {
            toast.error("Browser not ready");
            return;
          }
          await Promise.all(
            [...loadedTracksRef.current].map(async (track) => {
              await Promise.resolve(browser.removeTrack(track));
              loadedTracksRef.current.delete(track);
            })
          );
          bamsRef.current = bams;
          await Promise.all(
            bams.map((bam) =>
              limit(() =>
                browser
                  .loadTrack(bam)
                  .then((track) => loadedTracksRef.current.add(track))
              )
            )
          );
        }}
        onSearch={async (query) => {
          const browser = browserRef.current;
          const bams = bamsRef.current;
          if (bams.length === 0 || !browser) return;
          queryRef.current = query;
          toast.info(`Searching for ${query.query}`);
          await Promise.all(
            [...loadedTracksRef.current].map(async (track) => {
              await Promise.resolve(browser.removeTrack(track));
              loadedTracksRef.current.delete(track);
            })
          );
          loadedTracksRef.current.clear();
          await Promise.all(
            withQuery(bams, query).map((bam) =>
              limit(() =>
                browser
                  .loadTrack(bam)
                  .then((track) => loadedTracksRef.current.add(track))
              )
            )
          );
          browser.search(
            query.type === "gene"
              ? query.query
              : `${query.chr}:${query.start}-${query.end}`
          );
        }}
      />
      <IGVBrowser ref={browserRef} />
    </main>
  );
}
