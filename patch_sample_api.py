with open("src/app/api/import/sample/[type]/route.ts", "r") as f:
    content = f.read()

import re

# We will replace the entire blocks for parties and outstanding

parties_block = """    } else if (type === 'parties') {
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
      ];"""

outstanding_block = """    } else if (type === 'outstanding') {
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
      ];"""

content = re.sub(r'\} else if \(type === \'parties\'\) \{.*?(?=\} else if \(type === \'outstanding\'\))', parties_block + "\n", content, flags=re.DOTALL)
content = re.sub(r'\} else if \(type === \'outstanding\'\) \{.*?(?=\} else \{)', outstanding_block + "\n", content, flags=re.DOTALL)

with open("src/app/api/import/sample/[type]/route.ts", "w") as f:
    f.write(content)
