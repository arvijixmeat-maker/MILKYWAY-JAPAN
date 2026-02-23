import { supabase } from '../lib/supabaseClient';
import imageCompression from 'browser-image-compression';

/**
 * Uploads a file to Supabase Storage.
 * @param file The file object to upload
 * @param bucket The storage bucket name (default: 'images')
 * @param folder (Optional) The folder path within the bucket
 * @returns Promise<string> The public URL of the uploaded file
 */
export const uploadFile = async (file: File, bucket: string = 'images', folder: string = 'common'): Promise<string> => {
    try {
        // 1. Generate a unique file name
        // pattern: folder/timestamp_randomString_filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        // 2. Upload to specified bucket
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        // 3. Get Public URL
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('File upload failed:', error);
        throw error;
    }
};

/**
 * Uploads an image file with client-side WebP compression.
 * The original image is compressed and converted to WebP format before uploading,
 * preventing large file sizes and Base64 storage.
 * 
 * @param file The original image file
 * @param folder The folder path within the 'images' bucket
 * @returns Promise<string> The public URL of the uploaded image
 */
export const uploadImage = async (file: File, folder: string = 'common'): Promise<string> => {
    try {
        // Enforce WebP conversion and apply high quality compression
        const options = {
            maxSizeMB: 1, // Max file size 1MB (aggressive compression)
            maxWidthOrHeight: 1920, // Keep dimensions reasonable for web (max 1080p width/height)
            useWebWorker: true,
            fileType: 'image/webp', // Force WebP output format
            initialQuality: 0.85 // High quality WebP
        };

        let processedFile = file;

        // Only compress if the file is an image and not already highly optimized or small
        if (file.type.startsWith('image/')) {
            try {
                const compressedBlob = await imageCompression(file, options);
                // Create a new File from the compressed Blob with .webp extension
                const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                processedFile = new File([compressedBlob], newFileName, { type: 'image/webp' });
            } catch (compressionError) {
                console.warn('Image compression failed, falling back to original file:', compressionError);
                // Fallback to original file if compression fails unexpectedly
            }
        }

        // Upload the processed (WebP) file
        return await uploadFile(processedFile, 'images', folder);
    } catch (error) {
        console.error('Image upload failed:', error);
        throw error;
    }
};
