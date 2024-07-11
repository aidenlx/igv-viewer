import assert from "assert";

const chrom = [...Array.from({ length: 23 }, (_, i) => `${i + 1}`), "X", "Y"];

function getChrList(prefix = false) {
  if (prefix) return chrom.map((chr) => `chr${chr}`);

  return chrom;
}

export function parseRangeFromRegion(_query: string, defaultOffset: number) {
  try {
    const [query, offset] = _query.split("^");
    let [chr, region] = query.split(":");
    region = region?.replaceAll(",", "");

    assert(!!chr, `No chromosome provided in query: ${query}`);

    // IGV can handle chr-less regions, but samtools can't,
    // detect from bam header in remote
    chr = chr.replace(/^chr/, "");
    // support variant syntax (chr1-123-A-T)
    if (!region && chr.match(/^[0-9XY]{1,2}-\d+-[A-Z]+-[A-Z]+$/)) {
      [chr, region] = chr.split("-");
    } else if (region?.match(/^\d+-[A-Z]+-[A-Z]+$/)) {
      [region] = region.split("-");
    }
    assert(region, `No region provided in query: ${query}`);
    switch (region.split("-").length) {
      case 2: {
        const [start, end] = region.split("-");
        return toRange(chr, start, end, offset);
      }
      case 1: {
        if (offset) {
          return toRange(chr, region, region, offset);
        } else {
          return toRange(chr, region, region, defaultOffset.toString());
        }
      }
      default:
        throw new Error(`Invalid region: ${region}`);
    }
  } catch (e) {
    console.error(e);
    return null;
  }
}

function parsePos(input: string): number {
  input = input.replaceAll(",", "");
  if (Number.isInteger(+input) && +input > 0) {
    return +input;
  } else {
    return NaN;
  }
}

const allowedChroms = new Set(getChrList().concat("MT", "M"));

function toRange(chr: string, _start: string, _end: string, _offset: string) {
  let start = parsePos(_start),
    end = parsePos(_end);
  assert(allowedChroms.has(chr), `Invalid chromosome: ${chr}`);
  const offset = _offset?.trim() ? parsePos(_offset) : 0;
  assert(
    [start, end, offset].every((x) => !Number.isNaN(x)),
    `must be in format: (pos)-(pos)[^offset], got ${_start}-${_end}^${_offset}`
  );
  if (start > end) {
    console.warn(`Range start > end, swapping`);
    [start, end] = [end, start];
  }
  start = start - offset >= 0 ? start - offset : 1;
  end = end + offset;
  return { chr, start, end };
}
