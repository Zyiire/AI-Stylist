"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { Loader2 } from "lucide-react";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DETECTED_ATTRS = ["Wool Blend", "Oversized Silhouette", "Tonal Green", "Double Breasted"];
const SUGGESTED_TAGS = ["#minimalism", "#outerwear", "#scandi"];

export function PublishModal({ isOpen, onClose }: PublishModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>(SUGGESTED_TAGS);
  const [tagInput, setTagInput] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setScanning(true);
    setScanned(false);
    setTimeout(() => { setScanning(false); setScanned(true); }, 2200);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: scanning || publishing,
  });

  const addTag = () => {
    const t = tagInput.trim().replace(/^#?/, "#");
    if (t.length > 1 && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handlePublish = async () => {
    if (!file || !title.trim()) return;
    setPublishing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim());
      form.append("description", description);
      form.append("tags", tags.join(","));
      form.append("is_private", String(isPrivate));
      if (user?.id) form.append("user_id", user.id);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/search/upload`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `Error ${res.status}`);
      }
      setSuccess(true);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setFile(null); setPreview(null); setScanning(false); setScanned(false);
      setTitle(""); setDescription(""); setTags(SUGGESTED_TAGS);
      setTagInput(""); setIsPrivate(false); setSuccess(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal-card bg-surface w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">

        {success ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <span className="material-symbols-outlined text-primary text-5xl mb-4">check_circle</span>
            <h3 className="font-headline text-3xl font-extrabold tracking-tight text-primary mb-2">Published</h3>
            <p className="text-on-surface-variant font-body mb-10 max-w-xs">
              Your look is now live in the Mira community for others to discover.
            </p>
            <button
              onClick={handleClose}
              className="bg-primary text-on-primary px-8 py-3 rounded-xl text-sm font-bold font-label tracking-widest uppercase hover:bg-primary-container transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

            {/* Left: Upload / AI Scan zone */}
            <div className="lg:col-span-7 p-8 bg-surface-container-low">
              <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary mb-1">New Entry</h1>
              <p className="text-secondary font-medium opacity-80 mb-6 text-sm">
                AI-assisted social discovery for your digital atelier.
              </p>

              {/* Upload / scan area */}
              <div
                {...getRootProps()}
                className={`relative aspect-[4/5] rounded-xl overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${
                  preview ? "bg-surface-container" : "bg-surface-container border-2 border-dashed border-outline-variant/40 hover:border-primary/40"
                }`}
              >
                <input {...getInputProps()} />

                {preview ? (
                  <>
                    <Image src={preview} alt="preview" fill className="object-cover" />

                    {/* Scanning overlay */}
                    {scanning && (
                      <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] z-10">
                        {/* Animated scan line */}
                        <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-primary-container to-transparent shadow-[0_0_15px_#004d40] animate-bounce" style={{ top: "45%" }} />
                        <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-8">
                          <p className="text-xl font-headline font-bold text-on-primary mb-2">Analyzing Garment Architecture</p>
                          <p className="text-on-primary/80 text-sm max-w-xs">
                            Our vision model is identifying silhouettes and material properties.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Detected attribute tags */}
                    {scanned && (
                      <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2 z-10">
                        {DETECTED_ATTRS.map((attr) => (
                          <span key={attr} className="bg-surface-container-lowest/90 glass-nav px-3 py-1.5 rounded-full text-[10px] font-label uppercase tracking-widest font-bold flex items-center gap-2 text-primary shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            {attr}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center gap-4 px-8">
                    <div className="flex gap-4">
                      <span className="material-symbols-outlined text-4xl text-on-primary-container bg-surface-container-lowest p-4 rounded-full shadow-sm">photo_camera</span>
                      <span className="material-symbols-outlined text-4xl text-on-primary-container bg-surface-container-lowest p-4 rounded-full shadow-sm">image</span>
                    </div>
                    <p className="text-on-surface-variant font-body">
                      {isDragActive ? "Drop your photo here…" : "Drop a photo or click to browse"}
                    </p>
                    <p className="text-[10px] font-label uppercase tracking-widest text-outline">JPG · PNG · WEBP</p>
                  </div>
                )}
              </div>

              {/* Scanning loader text */}
              {scanning && (
                <div className="flex items-center gap-2 mt-4 text-primary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs font-label font-bold tracking-widest uppercase">Scanning garment…</span>
                </div>
              )}
            </div>

            {/* Right: Curation details form */}
            <div className="lg:col-span-5 p-8 sticky top-0">
              {/* Close button */}
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-headline text-2xl font-bold text-primary">Curation Details</h2>
                <button onClick={handleClose} className="text-outline hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-[10px] font-label uppercase tracking-[0.2em] font-bold text-outline">
                    Entry Title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Early Autumn Textures"
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 font-body text-on-surface text-sm"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] font-label uppercase tracking-[0.2em] font-bold text-outline">
                    Atmosphere &amp; Context
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the feeling, styling notes, or source inspiration…"
                    rows={4}
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 font-body text-on-surface text-sm resize-none"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-[10px] font-label uppercase tracking-[0.2em] font-bold text-outline">
                    Identity Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <span key={tag} className="bg-secondary-container/40 text-primary px-3 py-1 rounded-full text-xs font-medium font-label flex items-center gap-1">
                        {tag}
                        <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-primary/40 hover:text-primary ml-1">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      placeholder="Add tags…"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 font-body text-on-surface text-sm"
                    />
                    <button onClick={addTag} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary">
                      <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    </button>
                  </div>
                </div>

                {/* Private toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-sm font-bold text-primary font-body">Private Archive</p>
                    <p className="text-xs text-outline">Only visible in your personal atelier.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isPrivate ? "bg-primary" : "bg-surface-container-highest"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isPrivate ? "left-7" : "left-1"}`} />
                  </button>
                </div>

                {/* CTA */}
                <div className="pt-4">
                  <button
                    onClick={handlePublish}
                    disabled={!file || !title.trim() || publishing || scanning}
                    className="w-full bg-primary text-on-primary font-headline font-bold py-4 rounded-xl text-base hover:bg-primary-container transition-all flex items-center justify-center gap-3 group shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {publishing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
                    ) : (
                      <>Publish to Atelier <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span></>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-outline mt-3 uppercase tracking-widest font-label">
                    Entry will be added to your 2024 Archive
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
