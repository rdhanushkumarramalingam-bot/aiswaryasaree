import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use SERVICE ROLE key - bypasses RLS entirely
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = 'media';

// GET - List all files in the media bucket
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).list('', {
            limit: 200,
            sortBy: { column: 'created_at', order: 'desc' },
        });

        if (error) throw error;

        const fileList = (data || []).filter(f => f.id !== null);
        const filesWithUrls = fileList.map(file => {
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from(BUCKET_NAME)
                .getPublicUrl(file.name);
            return { ...file, url: publicUrl };
        });

        return NextResponse.json({ files: filesWithUrls });
    } catch (err) {
        console.error('List error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST - Upload a file
export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const catalogId = formData.get('catalogId'); // Get catalog ID if provided

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop();
        // Use catalog ID as filename if provided, otherwise use random name
        let fileName = catalogId ? `${catalogId}.${fileExt}` : `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        
        // Handle duplicate filenames by appending timestamp if needed
        try {
            const { data: existingFile } = await supabaseAdmin.storage
                .from(BUCKET_NAME)
                .getPublicUrl(fileName);
            
            // If we get here, file exists, append timestamp
            if (existingFile) {
                fileName = catalogId ? `${catalogId}-${Date.now()}.${fileExt}` : `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            }
        } catch (err) {
            // File doesn't exist, we can use the original name
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
                metadata: catalogId ? { catalogId: catalogId } : null // Store catalog ID in metadata
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return NextResponse.json({ 
            url: publicUrl, 
            name: fileName,
            catalogId: catalogId // Return catalog ID for display
        });
    } catch (err) {
        console.error('Upload error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE - Remove a file
export async function DELETE(request) {
    try {
        const { fileName } = await request.json();
        if (!fileName) return NextResponse.json({ error: 'No filename' }, { status: 400 });

        const { error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .remove([fileName]);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
