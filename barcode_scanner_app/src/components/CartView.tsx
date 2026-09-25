import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { productDb } from '../services/productDb';
import { CartSessionData, CartItemData } from '../types';

interface CartViewProps {
  pairedCartId: string;
  onNavigateToScan: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  pairedCartId,
  onNavigateToScan,
}) => {
  const [cartData, setCartData] = useState<CartSessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [paymentQr, setPaymentQr] = useState<any>(null);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const data = await productDb.getCartDetails(pairedCartId);
      if (data) {
        setCartData(data);
      }
    } catch (e) {
      console.warn('Failed to fetch cart:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    const interval = setInterval(fetchCart, 4000);
    return () => clearInterval(interval);
  }, [pairedCartId]);

  const handleUpdateQuantity = async (productId: number, newQty: number) => {
    if (newQty < 1) return;
    const res = await productDb.updateCartItem(pairedCartId, productId, newQty);
    if (res) setCartData(res);
  };

  const handleRemoveItem = async (itemId: number) => {
    const res = await productDb.removeCartItem(pairedCartId, itemId);
    if (res) setCartData(res);
  };

  const handleCheckout = async () => {
    if (!cartData || cartData.items.length === 0) {
      Alert.alert('Cart is Empty', 'Please scan or add items before checkout.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const qrRes = await productDb.getPaymentQr(pairedCartId);
      if (qrRes) {
        setPaymentQr(qrRes);
      }

      const res = await productDb.checkoutCart(pairedCartId);
      if (res && res.success) {
        Alert.alert(
          '🎉 Checkout Paid!',
          `Order #${res.orderId} completed successfully! Paid: ₹${res.totalPaid.toFixed(2)}. Cart reset for next shopper.`,
          [{ text: 'OK', onPress: () => { setPaymentQr(null); fetchCart(); } }]
        );
      }
    } catch (e) {
      Alert.alert('Checkout Error', 'Could not complete checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const items = cartData?.items || [];
  const total = cartData?.total ?? 0;
  const subtotal = cartData?.subtotal ?? 0;
  const discountAmount = cartData?.discountAmount ?? 0;
  const discountPercent = cartData?.discountPercent ?? 0;
  const itemCount = cartData?.itemCount ?? 0;
  const recommendations = cartData?.recommendations?.recommendations || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Cart Status Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.cartBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.cartBadgeText}>{pairedCartId} [SYNCED WITH ESP32]</Text>
          </View>
          <TouchableOpacity onPress={fetchCart} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>Active Shopping Session</Text>
        <Text style={styles.headerSub}>
          Items scanned with your phone camera sync live with the ESP32 OLED display and weight sensors.
        </Text>

        {/* Pricing Summary Box */}
        <View style={styles.priceSummaryBox}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Items in Cart</Text>
            <Text style={styles.priceValue}>{itemCount} units</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.colors.statusNormal }]}>
                Member Discount ({discountPercent}%)
              </Text>
              <Text style={[styles.priceValue, { color: theme.colors.statusNormal }]}>
                -₹{discountAmount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>FINAL TOTAL</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          style={[styles.checkoutBtn, (items.length === 0 || checkoutLoading) && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          disabled={items.length === 0 || checkoutLoading}
          activeOpacity={0.85}
        >
          {checkoutLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="card-outline" size={18} color="#fff" />
              <Text style={styles.checkoutBtnText}>CHECKOUT & PAY (₹{total.toFixed(2)})</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Cart Items Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>CART CONTENTS ({items.length})</Text>
        <TouchableOpacity style={styles.scanMoreBtn} onPress={onNavigateToScan}>
          <Ionicons name="scan-outline" size={14} color={theme.colors.accent} />
          <Text style={styles.scanMoreText}>Scan Item</Text>
        </TouchableOpacity>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Syncing with Smart Cart...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cart-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySub}>
            Use your phone's camera in the Scan tab to scan any product barcode (Milk, Biscuits, Chips, Coke).
          </Text>
          <TouchableOpacity style={styles.startScanBtn} onPress={onNavigateToScan}>
            <Ionicons name="camera-outline" size={16} color="#fff" />
            <Text style={styles.startScanText}>Open Scanner</Text>
          </TouchableOpacity>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemMain}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemMetaRow}>
                  <Text style={styles.itemPrice}>₹{item.price.toFixed(2)} each</Text>
                  <Text style={styles.shelfBadge}>{item.shelfLocation}</Text>
                </View>
              </View>
              <Text style={styles.itemLineTotal}>₹{item.lineTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.itemActions}>
              <View style={styles.qtyControl}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Ionicons name="remove" size={14} color={item.quantity <= 1 ? theme.colors.textMuted : theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                >
                  <Ionicons name="add" size={14} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveItem(item.id)}
              >
                <Ionicons name="trash-outline" size={16} color={theme.colors.statusDanger} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* AI Recommendations Section */}
      {recommendations.length > 0 && (
        <View style={styles.recsSection}>
          <Text style={styles.sectionTitle}>PAIRING RECOMMENDATIONS</Text>
          <Text style={styles.recsSub}>Smart suggestions powered by Indian retail shopping behavior:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recsScroll}>
            {recommendations.map((rec, idx) => (
              <View key={idx} style={styles.recCard}>
                <View style={styles.recBadge}>
                  <Text style={styles.recBadgeText}>{rec.badge || 'Recommended'}</Text>
                </View>
                <Text style={styles.recName}>{rec.name}</Text>
                <Text style={styles.recPrice}>₹{rec.price ? rec.price.toFixed(2) : '35.00'}</Text>
                <Text style={styles.recReason} numberOfLines={2}>{rec.reason}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: 16,
    marginBottom: 20,
    ...theme.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.statusNormalBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.statusNormal,
  },
  cartBadgeText: {
    fontSize: 11,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.statusNormal,
  },
  refreshBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.typography.sans,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 17,
  },
  priceSummaryBox: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: 12,
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
  },
  priceValue: {
    fontSize: 12,
    fontFamily: theme.typography.mono,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: theme.typography.sans,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: theme.typography.mono,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  checkoutBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutBtnDisabled: {
    opacity: 0.5,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  scanMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanMoreText: {
    fontSize: 12,
    fontFamily: theme.typography.sans,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.typography.sans,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  startScanBtn: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
  },
  startScanText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
  },
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: 12,
    marginBottom: 8,
  },
  itemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontFamily: theme.typography.sans,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPrice: {
    fontSize: 11,
    fontFamily: theme.typography.mono,
    color: theme.colors.textSecondary,
  },
  shelfBadge: {
    fontSize: 10,
    fontFamily: theme.typography.sans,
    color: theme.colors.accent,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  itemLineTotal: {
    fontSize: 14,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qtyText: {
    fontSize: 12,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    paddingHorizontal: 8,
  },
  removeBtn: {
    padding: 6,
  },
  recsSection: {
    marginTop: 20,
  },
  recsSub: {
    fontSize: 11,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  recsScroll: {
    flexDirection: 'row',
  },
  recCard: {
    width: 170,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: 10,
    marginRight: 10,
  },
  recBadge: {
    backgroundColor: theme.colors.statusNormalBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  recBadgeText: {
    fontSize: 9,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.statusNormal,
  },
  recName: {
    fontSize: 12,
    fontFamily: theme.typography.sans,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  recPrice: {
    fontSize: 11,
    fontFamily: theme.typography.mono,
    fontWeight: '600',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  recReason: {
    fontSize: 10,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
    lineHeight: 14,
  },
});
