import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface UploadedFileMetadata {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface ObjectUploaderProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  fileType?: string;
  onUploadComplete: (files: UploadedFileMetadata[]) => void;
  existingFiles?: UploadedFileMetadata[];
  className?: string;
}

export function ObjectUploader({
  label,
  accept = "*/*",
  multiple = false,
  maxFiles = 1,
  fileType = "document",
  onUploadComplete,
  existingFiles = [],
  className = "",
}: ObjectUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMetadata[]>(existingFiles);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxFiles - uploadedFiles.length;
    if (files.length > remainingSlots) {
      toast({
        title: "Too many files",
        description: `You can only upload ${remainingSlots} more file(s)`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const uploadedMetadata: UploadedFileMetadata[] = [];

      for (const file of files) {
        // Get signed upload URL from server
        const urlResponse = await fetch(`/api/upload-url?fileType=${fileType}`);
        if (!urlResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadUrl, filePath } = await urlResponse.json();

        // Upload file to object storage
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        // Capture file metadata
        uploadedMetadata.push({
          filePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        });
      }

      const newFiles = [...uploadedFiles, ...uploadedMetadata];
      setUploadedFiles(newFiles);
      onUploadComplete(newFiles);

      toast({
        title: "Upload successful",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUploadComplete(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || uploadedFiles.length >= maxFiles}
            data-testid={`button-upload-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {label}
              </>
            )}
          </Button>
          {uploadedFiles.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {uploadedFiles.length} / {maxFiles} file(s)
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploadedFiles.length > 0 && (
          <div className="space-y-2 mt-3">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">{file.fileName}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  data-testid={`button-remove-file-${index}`}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
