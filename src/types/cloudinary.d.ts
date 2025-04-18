declare module "next-cloudinary" {
  interface CldUploadButtonProps {
    children?: React.ReactNode;
    onUpload?: (result: { public_id: string; url: string; [key: string]: string | number | boolean }) => void;
    onError?: (error: Error) => void;
    onOpen?: () => void;
    options?: {
      maxFiles?: number;
      resourceType?: string;
      multiple?: boolean;
      tags?: string[];
      sources?: string[];
      clientAllowedFormats?: string[];
      maxFileSize?: number;
      cropping?: boolean;
      showPoweredBy?: boolean;
    };
    uploadPreset?: string;
    signatureEndpoint?: string;
  }

  export const CldUploadButton: React.FC<CldUploadButtonProps>;
  export const CldImage: React.FC<{
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
}
