with open("src/app/owner/import/parties/page.tsx", "r") as f:
    content = f.read()

import re

# Update findVal logic to match new columns
new_findVal_block = """
          return {
            partyName: findVal(['party name', 'ledger name', 'name']),
            partyCode: findVal(['code', 'ledger code', 'party id']),
            gstNumber: findVal(['gst', 'tin']),
            mobile: findVal(['mobile', 'phone', 'contact']),
            landline: findVal(['landline', 'phone 2']),
            email: findVal(['email']),
            deliveryRoute: findVal(['delivery route', 'route', 'area code']),
            addressLine1: findVal(['address line 1', 'address 1', 'add 1', 'address']),
            addressLine2: findVal(['address line 2', 'address 2', 'add 2']),
            addressLine3: findVal(['address line 3', 'address 3', 'add 3']),
            city: findVal(['city', 'station']),
            state: findVal(['state']),
            status: findVal(['status']) || 'Active'
          };
"""

content = re.sub(r'return \{.*?partyName: findVal.*?status: \'active\'.*?\};', new_findVal_block.strip(), content, flags=re.DOTALL)

with open("src/app/owner/import/parties/page.tsx", "w") as f:
    f.write(content)
