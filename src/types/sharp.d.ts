declare module "sharp" {
  type Metadata = {
    format?: string;
    height?: number;
    pages?: number;
    width?: number;
  };

  type SharpOptions = {
    animated?: boolean;
    failOn?: "none" | "truncated" | "error" | "warning";
    limitInputPixels?: boolean | number;
  };

  type SharpInstance = {
    metadata(): Promise<Metadata>;
  };

  export default function sharp(
    input?: Buffer | ArrayBuffer | Uint8Array | string,
    options?: SharpOptions,
  ): SharpInstance;
}
