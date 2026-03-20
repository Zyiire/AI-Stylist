"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, CheckCircle, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ["Topwear", "Bottomwear", "Dress", "Outerwear", "Footwear", "Bags", "Accessories"];

export function PublishModal({ isOpen, onClose }: PublishModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (f) setPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
  });

  const handlePublish = async () => {
    if (!preview || !name.trim()) return;
    setPublishing(true);
    await new Promise((r) => setTimeout(r, 1600));
    setPublishing(false);
    setSuccess(true);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setPreview(null); setName(""); setCategory("");
      setPrice(""); setDesc(""); setSuccess(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal-card bg-white w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-[#0D1F17]">
          <h2
            className="font-display text-white text-xl font-light"
            style={{ letterSpacing: "-0.03em" }}
          >
            Publish a Look
          </h2>
          <button
            onClick={handleClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-px h-12 bg-[#1B4332]/30 mx-auto mb-8" />
            <CheckCircle className="w-8 h-8 text-[#1B4332] mb-4" />
            <h3
              className="font-display font-light text-2xl text-[#0D1F17] mb-2"
              style={{ letterSpacing: "-0.03em" }}
            >
              Published
            </h3>
            <p className="text-gray-400 text-sm mb-10 tracking-wide max-w-xs">
              Your look is now live on Verdant for the community to discover.
            </p>
            <button
              onClick={handleClose}
              className="border border-[#1B4332] text-[#1B4332] text-xs font-medium tracking-[0.15em] uppercase px-8 py-3 hover:bg-[#1B4332] hover:text-white transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2">
            {/* Image upload */}
            <div className="p-8 border-b sm:border-b-0 sm:border-r border-gray-100">
              <div
                {...getRootProps()}
                className={`relative aspect-[3/4] border border-dashed cursor-pointer transition-all flex flex-col items-center justify-center overflow-hidden ${
                  isDragActive ? "border-[#1B4332] bg-[#f0fdf4]" : preview ? "border-transparent" : "border-gray-200 hover:border-[#2D6A4F]"
                }`}
              >
                <input {...getInputProps()} />
                {preview ? (
                  <Image src={preview} alt="preview" fill className="object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-gray-400 p-6 text-center">
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                    <p className="text-xs tracking-wide text-gray-500">
                      {isDragActive ? "Drop it here" : "Drop photo or click to browse"}
                    </p>
                    <p className="text-[10px] text-gray-400 tracking-widest uppercase">JPG · PNG · WEBP</p>
                  </div>
                )}
              </div>
            </div>

            {/* Form */}
            <div className="p-8 space-y-5">
              <FormField label="Item Name *">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Oversized Linen Blazer"
                  className="w-full pb-2 border-b border-gray-200 text-sm text-[#191919] placeholder:text-gray-400 focus:outline-none focus:border-[#1B4332] transition-colors tracking-wide bg-transparent"
                />
              </FormField>

              <FormField label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pb-2 border-b border-gray-200 text-sm text-[#191919] focus:outline-none focus:border-[#1B4332] transition-colors tracking-wide bg-transparent appearance-none cursor-pointer"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>

              <FormField label="Price (optional)">
                <div className="relative">
                  <span className="absolute left-0 top-0 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-4 pb-2 border-b border-gray-200 text-sm text-[#191919] placeholder:text-gray-400 focus:outline-none focus:border-[#1B4332] transition-colors tracking-wide bg-transparent"
                  />
                </div>
              </FormField>

              <FormField label="Description (optional)">
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Tell the community about this piece…"
                  rows={3}
                  className="w-full py-2 border-b border-gray-200 text-sm text-[#191919] placeholder:text-gray-400 focus:outline-none focus:border-[#1B4332] transition-colors tracking-wide bg-transparent resize-none"
                />
              </FormField>

              <div className="pt-2">
                <button
                  onClick={handlePublish}
                  disabled={!preview || !name.trim() || publishing}
                  className="w-full flex items-center justify-center gap-2 bg-[#0D1F17] text-white py-3.5 text-xs font-medium tracking-[0.15em] uppercase hover:bg-[#1B4332] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {publishing ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing…</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5" /> Publish Look</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
