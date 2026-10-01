import type { Metadata } from "next";

export function titleWithSingleBrand(title: string): Metadata["title"] {
  return /[|—–]\s*CASSEMIRO\s*$/iu.test(title) ? { absolute: title } : title;
}
