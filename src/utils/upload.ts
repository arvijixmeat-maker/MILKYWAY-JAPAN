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
 * Uploads an image file to Supabase Storage without client-side compression.
 * The original quality is preserved, and Supabase Image Transformation (SIT) 
 * will handle dynamic optimization on-the-fly.
 * 
 * @param file The original image file
 * @param folder The folder path within the 'images' bucket
 * @returns Promise<string> The public URL of the uploaded image
 */
export const uploadImage = async (file: File, folder: string = 'common'): Promise<string> => {
    try {
        // We now upload the original file. SIT handles optimization during serving.
        return uploadFile(file, 'images', folder);
    } catch (error) {
        console.error('Image upload failed:', error);
        throw error;
    }
};
