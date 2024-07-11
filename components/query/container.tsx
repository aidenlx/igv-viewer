/**
 * v0 by Vercel.
 * @see https://v0.dev/t/JU181pRL4pd
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
"use client";
import { useState } from "react";
import { Query, QueryContent, Search } from "./core";
import { toast } from "sonner";

import pLimit from "p-limit";

const portPathPattern = /^(?<port>\d+):(?<path>\/.+)$/;

const limit = pLimit(8);

export interface Track {
  id: string;
  name: string;
  url: string;
  indexURL: string;
  format: string;
}

export function withQuery(bams: Track[], query: QueryContent | null) {
  if (!query) return bams;
  let search = "";
  if (query.type === "gene") {
    search = `?gene=${query.query}`;
  } else if (query.type === "coord") {
    search = `?region=${query.query}`;
  }
  return bams.map((t) => ({
    ...t,
    url: t.url + search,
    indexURL: t.indexURL + search,
  }));
}

interface QueryContainerProps {
  onLoad(targetBams: Track[]): void;
  onSearch(query: QueryContent): void;
}

export function QueryContainer({ onLoad, onSearch }: QueryContainerProps) {
  const [rows, setRows] = useState<{ path: string; samples: string }[]>([
    { path: "", samples: "" },
  ]);

  const addRow = () => {
    setRows([...rows, { path: "", samples: "" }]);
  };

  const removeRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    if (newRows.length === 0) newRows.push({ path: "", samples: "" });
    setRows(newRows);
  };

  const handlePathChange = (index: number, value: string) => {
    const newRows = [...rows];
    newRows[index].path = value;
    setRows(newRows);
  };

  const handleFileChange = (index: number, file: string) => {
    const newRows = [...rows];
    newRows[index].samples = file;
    setRows(newRows);
  };

  const handleLoad = async () => {
    const targets: { port: number; path: string; samples: string[] }[] =
      rows.map(({ path, samples }, i) => {
        const match = path.match(portPathPattern);
        if (!match) {
          toast.error(
            `Invalid path in row ${
              i + 1
            }: ${path}, should be like 2333:/path/to/dir`
          );
          throw new Error(`Invalid path: ${path}`);
        }
        return {
          port: Number(match.groups!.port),
          path: match.groups!.path,
          samples: samples.split(/[;\s]/)
        };
      });
    const ac = new AbortController();
    const signal = ac.signal;
    function toPath(sample: string, root: string, ext: string) {
      return `${root.replace(
        /\/+$/,
        ""
      )}/${sample}/_sam/${sample}.bqsr.hg38.${ext}`;
    }
    // check existance of files
    await Promise.all(
      targets
        .flatMap(({ samples, path, port }, idx) =>
          ["bam", "bam.bai"].flatMap((ext) =>
            samples.map((sample) => ({
              idx,
              path: toPath(sample, path, ext),
              port,
            }))
          )
        )
        .map(({ idx, path, port }) =>
          limit(() =>
            fetch(`http://localhost:${port}/sam` + path, {
              signal,
              method: "HEAD",
            })
              .then((resp) => {
                if (resp.ok) return;
                throw new RespError(
                  resp.status,
                  `(row ${idx + 1}): ${port}:${path}`
                );
              })
              .catch((err) => {
                // console.error(`fetching row ${idx + 1}`, err);
                if (err instanceof RespError) throw err;
                throw new Error(
                  `Error fetching file in row ${idx + 1}: ${err.message}`
                );
              })
          )
        )
    ).catch((err) => {
      ac.abort();
      toast.error(err.message);
      throw new Error(err.message);
    });
    const targetBams = targets.flatMap(({ samples, path, port }, i1) =>
      samples.map(
        (sample, i2): Track => ({
          id: [sample, path, port, i1, i2].join("-"),
          name: sample,
          url: `http://localhost:${port}/sam` + toPath(sample, path, "bam"),
          indexURL:
            `http://localhost:${port}/sam` + toPath(sample, path, "bam.bai"),
          format: "bam",
        })
      )
    );
    onLoad(targetBams);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Query
        rows={rows}
        onRowsAdd={addRow}
        onRowRemove={removeRow}
        onPathChange={handlePathChange}
        onFileChange={handleFileChange}
        onRowSubmit={handleLoad}
      />
      <Search onSearch={onSearch} />
    </div>
  );
}

class RespError extends Error {
  constructor(code: number, message: string) {
    if (code === 404) {
      super(`File not found: ${message}`);
    } else {
      super(`${code}: ${message}`);
    }
  }
}
