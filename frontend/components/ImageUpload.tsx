"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { clsx } from "clsx";

interface ImageUploadProps {
  onSearch: (file: File) => void;
  loading: boolean;
  compact?: boolean;
}

export function ImageUpload({ onSearch, loading, compact = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setPreview(URL.createObjectURL(file));
      onSearch(file);
    },
    [onSearch]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: loading,
  });

  if (compact) {
    return (
      <div
        {...getRootProps()}
        className={clsx(
          "flex items-center gap-2 px-3 py-2 border cursor-pointer transition-all text-sm",
          "hover:border-[#1B4332] hover:text-[#1B4332]",
          isDragActive ? "border-[#1B4332] bg-[#f0fdf4]" : "border-gray-200 text-gray-500",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        {preview ? (
          <Image src={preview} alt="query" width={22} height={22} className="object-cover" />
        ) : (
          <ImageIcon className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
        )}
        <span className="truncate text-xs tracking-wide">
          {isDragActive ? "Drop here…" : "Upload photo"}
        </span>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto shrink-0 text-[#2D6A4F]" />}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "relative border border-dashed p-10 text-center cursor-pointer",
        "transition-all duration-200 select-none",
        isDragActive
          ? "border-[#1B4332] bg-[#f0fdf4]"
          : "border-gray-200 hover:border-[#40916C]",
        loading && "opacity-60 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      {preview ? (
        <div className="flex flex-col items-center gap-3">
          <Image
            src={preview}
            alt="Uploaded preview"
            width={110}
            height={110}
            className="object-cover"
          />
          <p className="text-sm text-gray-400 tracking-wide">
            {loading ? "Searching…" : "Drop another image to search again"}
          </p>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[#40916C]" />}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Camera className="w-5 h-5 text-[#40916C]" />
          <div>
            <p className="text-sm font-medium text-[#191919] tracking-wide">
              {isDragActive ? "Drop your photo here" : "Drop a clothing photo"}
            </p>
            <p className="text-xs text-gray-400 mt-1 tracking-wide">or click to browse · JPEG, PNG, WEBP</p>
          </div>
        </div>
      )}
    </div>
  );
}
