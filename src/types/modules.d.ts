declare module "mammoth" {
  export interface RawTextResult {
    value: string;
    messages: any[];
  }
  export function extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<RawTextResult>;
}

declare module "pptxgenjs";
