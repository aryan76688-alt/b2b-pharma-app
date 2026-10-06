import re

with open("src/app/owner/dashboard/page.tsx", "r") as f:
    content = f.read()

# Replace topProducts in destructuring
content = content.replace("const { summary, salesTrend, salesmenPerformance, topProducts, recentOrders } = data.data;", "const { summary, salesTrend, salesmenPerformance, nearExpiryProducts = [], recentOrders } = data.data;")

# Replace the Card itself
old_card_pattern = r'<Card className="border border-slate-200">\s*<CardHeader className="pb-2">.*?Top Pharma Products.*?</CardContent>\s*</Card>'
new_card = """
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                    Near Expiry Stock
                  </CardTitle>
                  <p className="text-xs text-slate-400">Products expiring within {summary?.nearExpiryBatches ? 'threshold' : '90'} days</p>
                </div>
                <Link href="/owner/stock/near-expiry" className="text-xs text-shreeji-blue font-semibold hover:underline">
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nearExpiryProducts.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No near expiry stock found.</p>
                ) : (
                  nearExpiryProducts.map((p: any, i: number) => (
                    <div
                      key={p.productId + '-' + p.batchNo}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/50 border border-amber-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500">
                            Batch: {p.batchNo} • Stock: {p.stockQty} {p.packing}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-red-600">{p.daysToExpiry} Days left</p>
                        <p className="text-[10px] text-slate-500">{new Date(p.expiryDate).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
"""

content = re.sub(old_card_pattern, new_card.strip(), content, flags=re.DOTALL)

with open("src/app/owner/dashboard/page.tsx", "w") as f:
    f.write(content)
