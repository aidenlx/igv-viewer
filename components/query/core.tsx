/**
 * v0 by Vercel.
 * @see https://v0.dev/t/JU181pRL4pd
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */

import { TrashIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseRangeFromRegion } from "./parse";
import { toast } from "sonner";

interface QueryProps {
  rows: { path: string; samples: string }[];
  onRowsAdd: () => void;
  onRowRemove: (index: number) => void;
  onRowSubmit: () => void;
  onPathChange: (index: number, value: string) => void;
  onFileChange: (index: number, file: string) => void;
}

// Modify the Query component to use props instead of its own state and handlers.
export function Query({
  rows,
  onFileChange,
  onPathChange,
  onRowRemove,
  onRowsAdd,
  onRowSubmit,
}: QueryProps) {
  const canRemove = rows.length > 1;
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-4 bg-muted p-4">
        <div>Path</div>
        <div>File</div>
        <div>Actions</div>
      </div>
      <div className="divide-y">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 p-4"
          >
            <Input
              type="text"
              value={row.path}
              onChange={(e) => onPathChange(index, e.target.value)}
              placeholder="2333:/path/to/dir"
            />
            <Input
              type="text"
              value={row.samples}
              onChange={(e) => onFileChange(index, e.target.value)}
              placeholder="file.txt"
            />
            <Button
              variant="outline"
              size="icon"
              disabled={!canRemove}
              onClick={() => onRowRemove(index)}
            >
              <TrashIcon className="w-4 h-4" />
              <span className="sr-only">Remove row</span>
            </Button>
          </div>
        ))}
      </div>
      <div className="p-4 flex justify-between">
        <Button onClick={onRowsAdd}>Add Row</Button>
        <Button onClick={onRowSubmit}>Load</Button>
      </div>
    </div>
  );
}

export type QueryContent =
  | {
      query: string;
      type: "gene";
    }
  | {
      chr: string;
      start: number;
      end: number;
      query: string;
      type: "coord";
    };

export function Search({
  onSearch,
}: {
  onSearch: (query: QueryContent) => void;
}) {
  return (
    <form
      className="border rounded-lg overflow-hidden mt-4"
      onSubmit={(evt) => {
        evt.preventDefault();
        const form = evt.target as HTMLFormElement;
        const result = {
          query: (form.elements.namedItem("query") as HTMLInputElement).value,
          type: (form.elements.namedItem("type") as HTMLSelectElement).value as
            | "gene"
            | "coord",
        };
        if (result.type === "gene") {
          onSearch({
            query: result.query,
            type: "gene",
          });
        } else {
          try {
            const region = parseRangeFromRegion(result.query, 200);
            if (!region) {
              throw new Error("Invalid region");
            }
            onSearch({
              chr: region.chr,
              start: region.start,
              end: region.end,
              type: "coord",
              query: result.query,
            });
          } catch (e) {
            toast.error((e as Error).message);
          }
        }
      }}
    >
      <div className="grid grid-cols-[1fr_1fr_auto] gap-4 bg-muted p-4">
        <div>Search</div>
        <div>Search Type</div>
        <div>Actions</div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-4 p-4">
        <Input
          name="query"
          placeholder="Enter search term"
          required
          className="flex-1 min-w-[200px]"
        />
        <Select name="type" required defaultValue="coord">
          <SelectTrigger>
            <SelectValue placeholder="Select search type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gene">Gene</SelectItem>
            <SelectItem value="coord">Position</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Search</Button>
      </div>
    </form>
  );
}
