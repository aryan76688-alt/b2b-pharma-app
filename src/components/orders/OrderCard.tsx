import React from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { OrderStatusBadge } from './OrderStatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShoppingBag, ChevronRight, User, Calendar, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderCardProps {
  order: Order;
  isOwner?: boolean;
  onApprove?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
}

export function OrderCard({ order, isOwner = false, onApprove, onReject }: OrderCardProps) {
  const detailHref = isOwner ? `/owner/orders/${order.id}` : `/salesman/orders/${order.id}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all shadow-soft flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm sm:text-base">
                {order.orderNumber}
              </span>
              <OrderStatusBadge status={order.status} />
            </div>
            <h4 className="font-semibold text-slate-800 text-sm mt-0.5">
              {order.partyName || 'Chemist Store'}
            </h4>
            {order.partyCity && (
              <p className="text-xs text-slate-500">
                {order.partyArea ? `${order.partyArea}, ` : ''}{order.partyCity}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="text-base sm:text-lg font-bold text-slate-900 block">
              {formatCurrency(order.totalAmount)}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              {formatDate(order.orderDate)}
            </span>
          </div>
        </div>

        {/* Quantities & Salesman Info */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50 rounded-lg text-center text-xs my-2.5 border border-slate-100">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sale Qty</span>
            <span className="font-bold text-slate-800">{order.totalQuantity} Units</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Free Bonus</span>
            <span className="font-bold text-emerald-600">
              {order.totalFreeQuantity > 0 ? `+${order.totalFreeQuantity} Free` : '0 Free'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Items</span>
            <span className="font-bold text-slate-800">{order.items?.length || 1} Products</span>
          </div>
        </div>

        {isOwner && order.salesmanName && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Salesman: <strong className="text-slate-700">{order.salesmanName}</strong></span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-1">
        <Link href={detailHref} className="text-xs font-semibold text-shreeji-blue hover:underline flex items-center gap-1">
          View Details <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        {isOwner && order.status === 'pending' && (
          <div className="flex items-center gap-1.5">
            {onReject && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:bg-red-50 border-red-200 h-8 px-2.5 text-xs"
                onClick={() => onReject(order.id)}
              >
                <X className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
            )}
            {onApprove && (
              <Button
                size="sm"
                variant="primary"
                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onApprove(order.id)}
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Approve
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
