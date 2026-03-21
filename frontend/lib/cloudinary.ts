/**
 * Inserts Cloudinary URL transformations to serve high-quality, correctly-sized images.
 * q_auto:best  — maximum automatic quality
 * f_auto       — serve WebP/AVIF where supported
 * w_{width}    — resize to target width (Cloudinary upscales if needed)
 */
export function optimizeImage(url: string, width = 800): string {
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/q_auto:best,f_auto,w_${width}/`);
}
