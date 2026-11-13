"use client";

import { useEffect, useRef, useState } from "react";

const MAX_PRODUCT_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type PreviewItem = { file: File; url: string };

async function uploadProductImage(file: File): Promise<string> {
  const uploadData = new FormData();
  uploadData.set("file", file);
  const response = await fetch("/api/admin/product-images", {
    method: "POST",
    body: uploadData,
  });
  const result: unknown = await response.json();
  if (
    response.ok &&
    typeof result === "object" &&
    result !== null &&
    "imageUrl" in result &&
    typeof result.imageUrl === "string"
  ) {
    return result.imageUrl;
  }
  const message =
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
      ? result.error
      : "The image could not be uploaded. Please try again.";
  throw new Error(message);
}

export function useProductMedia() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<Map<File, string>>(new Map());
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [imageError, setImageError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const previewItemsRef = useRef(previewItems);

  useEffect(() => {
    previewItemsRef.current = previewItems;
  }, [previewItems]);

  useEffect(
    () => () => {
      for (const preview of previewItemsRef.current) URL.revokeObjectURL(preview.url);
    },
    [],
  );

  function syncInputFiles(nextFiles: File[]) {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    nextFiles.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
  }

  function replaceFiles(nextFiles: File[]) {
    for (const preview of previewItemsRef.current) URL.revokeObjectURL(preview.url);
    const nextPreviews = nextFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    previewItemsRef.current = nextPreviews;
    setPreviewItems(nextPreviews);
    setFiles(nextFiles);
    setPrimaryIndex(0);
    setUploadedImageUrls(
      (current) => new Map([...current].filter(([file]) => nextFiles.includes(file))),
    );
    syncInputFiles(nextFiles);
  }

  function addFiles(nextFiles: File[]) {
    if (!nextFiles.length) return;
    const allFiles = [...files, ...nextFiles];
    if (allFiles.length > 20) {
      setImageError("Add no more than 20 product images.");
      syncInputFiles(files);
      return;
    }
    const invalid = allFiles.find(
      (file) =>
        file.size > MAX_PRODUCT_IMAGE_SIZE ||
        (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)),
    );
    if (invalid) {
      setImageError("Choose JPG, PNG, WEBP, or GIF images up to 10 MB each.");
      syncInputFiles(files);
      return;
    }
    setImageError("");
    replaceFiles(allFiles);
  }

  function removeFile(index: number) {
    replaceFiles(files.filter((_, fileIndex) => fileIndex !== index));
  }

  async function uploadAll(onImageUploaded?: (imageUrl: string) => void): Promise<string[]> {
    const uploadedUrls: string[] = [];
    setUploadProgress(0);
    for (const [index, file] of files.entries()) {
      const existingUrl = uploadedImageUrls.get(file);
      const imageUrl = existingUrl ?? (await uploadProductImage(file));
      uploadedUrls.push(imageUrl);
      if (!existingUrl) {
        setUploadedImageUrls((current) => new Map(current).set(file, imageUrl));
      }
      onImageUploaded?.(imageUrl);
      setUploadProgress(index + 1);
    }
    return uploadedUrls;
  }

  const progressValue =
    uploadProgress === null ? 0 : Math.round((uploadProgress / files.length) * 100);

  return {
    files,
    previewItems,
    primaryIndex,
    setPrimaryIndex,
    imageError,
    setImageError,
    inputRef,
    uploadProgress,
    progressValue,
    addFiles,
    removeFile,
    uploadAll,
    clearUploadProgress: () => setUploadProgress(null),
  };
}
