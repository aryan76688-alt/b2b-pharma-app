import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { mode, context } = await req.json();
    
    // Choose model based on "brain size" requirement
    // "Big brain" = pro, "Small brain" = flash
    const model = mode === 'deep' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

    // Fetch live DB data to feed the AI
    const stockRes = await query(`SELECT COUNT(*) as count, SUM(stock_qty * ptr) as total_value FROM products WHERE stock_qty > 0`);
    const ordersRes = await query(`SELECT COUNT(*) as count, SUM(total_amount) as total_sales FROM orders WHERE status = 'approved'`);
    
    const dbContext = `
      Current Inventory: ${stockRes.rows[0].count} active products. Total Value: ₹${stockRes.rows[0].total_value}
      Total Approved Orders: ${ordersRes.rows[0].count}. Total Sales: ₹${ordersRes.rows[0].total_sales}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: `You are Shreeji Healthcare's AI Business Assistant. You are the "${mode === 'deep' ? 'Big Brain (Deep Analysis)' : 'Small Brain (Quick Insights)'}".
      Context from User: ${context || 'Analyze my business.'}
      Live Database Data: ${dbContext}
      Provide your insights in 3 short, punchy bullet points. Format beautifully in Markdown.`,
    });

    return NextResponse.json({
      success: true,
      data: response.text
    });
  } catch (error: any) {
    console.error('AI Error:', error);
    return handleAuthError(error);
  }
}
