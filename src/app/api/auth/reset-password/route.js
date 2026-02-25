import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
    const { pin, newPassword } = await req.json();

    const RECOVERY_PIN = process.env.ADMIN_RECOVERY_PIN || '1234';

    if (!pin || pin !== RECOVERY_PIN) {
        return NextResponse.json({ error: 'Invalid recovery PIN.' }, { status: 401 });
    }

    if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    try {
        // Update ADMIN_PASSWORD in .env.local
        const envPath = path.join(process.cwd(), '.env.local');
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Replace the ADMIN_PASSWORD line
        if (envContent.includes('ADMIN_PASSWORD=')) {
            envContent = envContent.replace(/ADMIN_PASSWORD=.*/m, `ADMIN_PASSWORD=${newPassword}`);
        } else {
            envContent += `\nADMIN_PASSWORD=${newPassword}`;
        }

        fs.writeFileSync(envPath, envContent, 'utf8');

        return NextResponse.json({ success: true, message: 'Password updated successfully!' });
    } catch (err) {
        console.error('Reset error:', err);
        return NextResponse.json({ error: 'Failed to update password. Try again.' }, { status: 500 });
    }
}
