import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { createExcelBuffer, createStyledExcelBuffer } from '@/lib/excel';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    await requireOwner(req);
    const { type } = await params;

    let sheetName = 'Sample';
    let data: any[] = [];
    let filename = `sample_${type}.xlsx`;

        if (type === 'stock') {
      sheetName = 'Stock_Import_Template';
      filename = 'shreeji_stock_template.xlsx';
      data = [
        {
          'Code': 'A001559',
          'Product Name': '1 2 KA 4-5GM*6*12 SACHET 5GM',
          'Unit': 'PCS',
          'Current Stock': -1,
          'M.R.P.': 10.08,
          'Purchase Price': 4.25,
          'Sales Price': 5.10,
          'Company': 'PLENTIOS',
          'Batch': '',
          'EXP': '- -'
        },
        {
          'Code': 'A001384',
          'Product Name': '10D 500ML ONEDRIP*25PCS 500ML',
          'Unit': 'PCS',
          'Current Stock': 5,
          'M.R.P.': 36.72,
          'Purchase Price': 20.00,
          'Sales Price': 24.00,
          'Company': 'ONEDRIP',
          'Batch': 'S04250004',
          'EXP': '01-Sep-28'
        },
        {
          'Code': 'A001384',
          'Product Name': '10D 500ML ONEDRIP*25PCS 500ML',
          'Unit': 'PCS',
          'Current Stock': 15,
          'M.R.P.': 37.60,
          'Purchase Price': 21.50,
          'Sales Price': 26.50,
          'Company': 'ONEDRIP',
          'Batch': 'S04260002',
          'EXP': '01-Jun-29'
        },
        {
          'Code': '03130',
          'Product Name': '10ML SYRINGE ATPL*50 1PCS',
          'Unit': '',
          'Current Stock': 933,
          'M.R.P.': 51.00,
          'Purchase Price': 3.00,
          'Sales Price': 3.90,
          'Company': 'ALPHA',
          'Batch': '2607436',
          'EXP': '01-Jun-31'
        },
        {
          'Code': '2503',
          'Product Name': '10ML SYRINGE LEE 1*50 1*50',
          'Unit': 'PCS',
          'Current Stock': 230,
          'M.R.P.': 18.00,
          'Purchase Price': 3.50,
          'Sales Price': 4.20,
          'Company': 'LEEFORD WELLNESS',
          'Batch': 'Q1101026F00',
          'EXP': '01-May-31'
        },
        {
          'Code': '2503',
          'Product Name': '10ML SYRINGE LEE 1*50 1*50',
          'Unit': 'PCS',
          'Current Stock': 2000,
          'M.R.P.': 18.00,
          'Purchase Price': 3.50,
          'Sales Price': 4.20,
          'Company': 'LEEFORD WELLNESS',
          'Batch': '2615810NB205',
          'EXP': '01-May-31'
        }
      ];
        } else if (type === 'parties') {
      sheetName = 'Parties_Import_Template';
      filename = 'shreeji_parties_template.xlsx';
      data = [
        {
          'Party Name': '1KIRAN NEW',
          'Code': '',
          'Delivery Route': 'DAHEGAM',
          'Address Line 1': 'DAHEGAM',
          'Address Line 2': '',
          'Address Line 3': '',
          'City': 'DAHEGAM',
          'State': 'GUJARAT',
          'Mobile No.': '9408502561',
          'Landline': '',
          'Email': '',
          'GST No.': '',
          'Status': 'Active'
        },
        {
          'Party Name': 'AADESH SURGICALS',
          'Code': '',
          'Delivery Route': '197, GALIYARANI POLE',
          'Address Line 1': 'OPP PATEL PRINTING PRESS',
          'Address Line 2': 'NR RAIPUR GATE RAIPUR AHMEDABBAD',
          'Address Line 3': '',
          'City': 'AHMEDABAD',
          'State': 'GUJARAT',
          'Mobile No.': '',
          'Landline': '',
          'Email': '',
          'GST No.': '24AIYPP5169P1Z2',
          'Status': 'Active'
        }
      ];
    } else if (type === 'outstanding') {
      sheetName = 'Outstanding_Template';
      filename = 'shreeji_outstanding_template.xlsx';
      data = [
        {
          'Party': 'A TO Z PHARMACY NARODA',
          'Last Bill Date': '28-09-2026',
          'Last Payment Received Date': '',
          'Total Outstanding': '₹2,255.00',
          'Days Since Last Payment': ''
        },
        {
          'Party': 'AADHYASHAKTI MEDICAL STORE',
          'Last Bill Date': '04-05-2024',
          'Last Payment Received Date': '04-05-2024',
          'Total Outstanding': '₹1,530.00',
          'Days Since Last Payment': '877 Days'
        }
      ];
} else {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'Invalid sample type' } },
        { status: 400 }
      );
    }

    const buffer = await createStyledExcelBuffer(sheetName, data);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
