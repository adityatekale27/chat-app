declare module "next-cloudinary" {
  interface CldUploadButtonProps {
    children?: React.ReactNode;
    onUpload?: (result: any) => void;
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
  export const CldImage: React.FC<any>;
}
