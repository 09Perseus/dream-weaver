const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Returns the full public URL for a file in a Supabase storage bucket.
 */
export function getPublicUrl(bucket: string, filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
}
