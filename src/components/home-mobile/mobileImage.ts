import { getOptimizedImageUrl, type ImagePreset } from '../../utils/cloudflareImage';
import { isUsableImage } from '../desktop-primitives/mwTokens';

/** Cloudflare-resized URL, or '' for missing / placeholder images. */
export const img = (url: string | undefined, preset: ImagePreset) => (isUsableImage(url) ? getOptimizedImageUrl(url, preset) : '');
