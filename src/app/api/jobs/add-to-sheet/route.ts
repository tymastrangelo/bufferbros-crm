// src/app/api/jobs/add-to-sheet/route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { type Job, type Client, type Vehicle, type Service, type Addon } from '@/lib/types';

console.log("API Route file /api/jobs/add-to-sheet/route.ts was loaded by Next.js");

interface SheetPayload {
  job: Job;
  client?: Client;
  vehicle?: Vehicle | null;
  service?: Service;
  addons: Addon[];
}

export async function POST(request: Request) {
  try {
    const body: SheetPayload = await request.json();
    const { job, client, vehicle, service, addons } = body;

    // Ensure required environment variables are set
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      console.error('Google Sheets API environment variables are not set.');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newline characters
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const serviceName = service?.name ?? 'Custom Service';
    const addonNames = addons.map(a => a.name).join(', ') || 'None';
    const vehicleInfo = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A';

    // These are the values for the new row. The order must match your sheet's columns.
    const values = [
      [
        job.id,
        job.scheduled_date ? new Date(job.scheduled_date).toLocaleString() : 'Not Scheduled',
        client?.full_name ?? 'N/A',
        client?.phone ?? 'N/A',
        client?.email ?? 'N/A',
        client?.address ?? 'N/A', // Client's address/location
        client?.notes ?? '',      // Client's notes
        vehicleInfo,
        serviceName,
        addonNames,
        job.total_price,
        job.status,
        job.notes ?? '',
        new Date().toISOString(), // Timestamp of when it was added to the sheet
      ],
    ];

    const resource = {
      values,
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Jobs!A1', // IMPORTANT: Change 'Jobs' to the exact name of your sheet tab.
      valueInputOption: 'USER_ENTERED',
      requestBody: resource,
    });

    return NextResponse.json({ message: 'Successfully added to Google Sheet' });

  } catch (error) {
    console.error('Error adding to Google Sheet:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to add job to Google Sheet.', details: errorMessage }, { status: 500 });
  }
}
