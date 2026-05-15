import { NextResponse } from 'next/server';
import { getSectionsServer } from '@/lib/data/sections-server';

export async function GET() {
  try {
    const sections = await getSectionsServer();
    return NextResponse.json(sections);
  } catch (error) {
    console.error('Failed to load dynamic sections', error);
    return NextResponse.json([]);
  }
}
