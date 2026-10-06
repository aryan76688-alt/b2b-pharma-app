with open('/home/aryan/.gemini/antigravity/brain/f5591afa-07ff-44a3-a163-ded3ba6c2f9a/walkthrough.md', 'a') as f:
    f.write("\n\n## Update 3: Stock Report Excel Import (1-to-Many Batches)\n\n")
    f.write("- **API & Database**: Overhauled `/api/import/stock` to normalize uploaded rows into `products` and `product_batches`. Enforced mapping `Sales Price` to `PTR` and dropping `Purchase Price`. Handled dynamic stock accumulation.\n")
    f.write("- **Owner UI**: Refactored `src/app/owner/import/page.tsx` to handle in-browser parsing of the Excel file, detect dynamic header rows, visually group product batches, and present an explicit Column Mapping UI before uploading.\n")
    f.write("- **Salesman UI**: Rewrote `src/app/salesman/orders/create/page.tsx` to include a `Select Batch` modal. Salesmen now pick from available product batches, which correctly assigns specific `PTR` and `MRP` to order line items.\n")
    f.write("- **Testing**: Scaffolded a Vitest suite covering the 14 import logic requirements.\n")
    f.write("- **Deployment**: Deployed the finalized changes to production on Railway.\n")
