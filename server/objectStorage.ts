import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const OBJECT_STORAGE_MODE = process.env.OBJECT_STORAGE_MODE || "replit";
export const LOCAL_OBJECT_DIR = path.resolve(
  process.env.LOCAL_OBJECT_DIR || path.join(process.cwd(), "local-object-storage"),
);
export const LOCAL_MAX_UPLOAD_BYTES =
  parseInt(process.env.LOCAL_MAX_UPLOAD_BYTES || "", 10) || 20 * 1024 * 1024;

if (OBJECT_STORAGE_MODE === "local") {
  fs.mkdirSync(LOCAL_OBJECT_DIR, { recursive: true });
}

export const objectStorageClient =
  OBJECT_STORAGE_MODE === "replit"
    ? new Storage({
        credentials: {
          audience: "replit",
          subject_token_type: "access_token",
          token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
          type: "external_account",
          credential_source: {
            url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
            format: {
              type: "json",
              subject_token_field_name: "access_token",
            },
          },
          universe_domain: "googleapis.com",
        },
        projectId: "",
      })
    : undefined;

export class ObjectStorageService {
  private getPrivateObjectDir(): string {
    if (OBJECT_STORAGE_MODE === "local") {
      return LOCAL_OBJECT_DIR;
    }
    const dir = process.env.PRIVATE_OBJECT_DIR;
    if (!dir) {
      throw new Error("PRIVATE_OBJECT_DIR not set");
    }
    return dir;
  }

  async getUploadURL(fileType: string = "document"): Promise<string> {
    if (OBJECT_STORAGE_MODE === "local") {
      const objectId = randomUUID();
      await this.ensureLocalDirectory(fileType);
      return `/api/local-object/upload/${objectId}?type=${encodeURIComponent(fileType)}`;
    }

    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/${fileType}s/${objectId}`;
    const { bucketName, objectName } = this.parseObjectPath(fullPath);

    return this.signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  normalizeObjectPath(uploadURL: string): string {
    if (OBJECT_STORAGE_MODE === "local") {
      const url = new URL(`http://localhost${uploadURL}`);
      const objectId = url.pathname.split("/").pop();
      const fileType = url.searchParams.get("type") || "document";
      return `/api/local-object/download/${objectId}?type=${encodeURIComponent(fileType)}`;
    }

    if (!uploadURL.startsWith("https://storage.googleapis.com/")) {
      return uploadURL;
    }
    
    const url = new URL(uploadURL);
    return url.pathname;
  }

  async getViewURL(
    filePath: string,
    options: { mimeType?: string; fileName?: string; forceInline?: boolean } = {}
  ): Promise<string> {
    if (OBJECT_STORAGE_MODE === "local") {
      return filePath;
    }
    const { bucketName, objectName } = this.parseObjectPath(filePath);

    const responseContentType = options.mimeType;
    const responseContentDisposition = options.forceInline
      ? options.fileName
        ? `inline; filename="${options.fileName}"`
        : "inline"
      : undefined;

    return this.signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec: 3600, // 1 hour
      responseContentType,
      responseContentDisposition,
    });
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new Error("Invalid path");
    }

    return {
      bucketName: pathParts[1],
      objectName: pathParts.slice(2).join("/"),
    };
  }

  private async signObjectURL({
    bucketName,
    objectName,
    method,
    ttlSec,
    responseContentType,
    responseContentDisposition,
  }: {
    bucketName: string;
    objectName: string;
    method: "GET" | "PUT";
    ttlSec: number;
    responseContentType?: string;
    responseContentDisposition?: string;
  }): Promise<string> {
      if (!objectStorageClient) {
        throw new Error("Object storage client not configured");
      }

      const request: Record<string, unknown> = {
        bucket_name: bucketName,
        object_name: objectName,
        method,
        expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
      };

    if (responseContentType) {
      request.response_content_type = responseContentType;
    }
    if (responseContentDisposition) {
      request.response_content_disposition = responseContentDisposition;
    }
    
    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to sign object URL: ${response.status}`);
    }

    const { signed_url } = await response.json();
    return signed_url;
  }

  private async ensureLocalDirectory(fileType: string) {
    const dirPath = path.join(LOCAL_OBJECT_DIR, `${fileType}s`);
    await fsPromises.mkdir(dirPath, { recursive: true });
  }
}
