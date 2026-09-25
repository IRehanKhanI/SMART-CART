import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { theme } from '../theme';

const { width } = Dimensions.get('window');
const SCAN_SIZE = Math.min(width * 0.72, 300);

interface ScannerOverlayProps {
  scanned: boolean;
  scanMode: 'single' | 'batch';
  scannerType?: 'cart' | 'catalog';
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  scanned,
  scanMode,
  scannerType = 'cart',
}) => {
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    if (!scanned) {
      animation.start();
    } else {
      laserAnim.stopAnimation();
    }

    return () => animation.stop();
  }, [scanned]);

  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, SCAN_SIZE - 12],
  });

  const isCartMode = scannerType === 'cart';

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top Mask */}
      <View style={styles.maskTop} />

      {/* Middle Row with Scan Target Box */}
      <View style={styles.maskMiddle}>
        <View style={styles.maskSide} />

        <View style={[styles.scanBox, scanned && styles.scanBoxSuccess]}>
          {/* 8px Precision Corner Marks */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {/* Subdued Scanning Alignment Line */}
          {!scanned && (
            <Animated.View
              style={[
                styles.laserLine,
                { transform: [{ translateY }] },
              ]}
            />
          )}

          {/* Scanned Confirmation Overlay */}
          {scanned && (
            <View style={styles.successPulse}>
              <View style={styles.successIconCircle}>
                <Text style={styles.successIcon}>✓</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.maskSide} />
      </View>

      {/* Bottom Mask with Operational Status */}
      <View style={styles.maskBottom}>
        <View style={styles.hudCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: scanned
                    ? theme.colors.statusNormal
                    : isCartMode
                    ? theme.colors.accent
                    : '#3B82F6',
                },
              ]}
            />
            <Text style={styles.statusText}>
              {scanned
                ? isCartMode
                  ? 'ITEM ADDED TO CART'
                  : 'BARCODE DECODED'
                : isCartMode
                ? 'ALIGN ITEM BARCODE / QR FOR CART'
                : 'ALIGN SKU BARCODE TO REGISTER'}
            </Text>
          </View>

          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>
              {isCartMode ? '🛒 CART SCANNER' : '📦 CATALOG SCANNER'} •{' '}
              {scanMode === 'single' ? 'SINGLE SCAN' : 'MULTI-SCAN (BATCH)'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskTop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(32, 37, 34, 0.45)',
  },
  maskMiddle: {
    flexDirection: 'row',
    height: SCAN_SIZE,
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(32, 37, 34, 0.45)',
  },
  scanBox: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: theme.radius,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scanBoxSuccess: {
    borderColor: theme.colors.statusNormal,
    backgroundColor: 'rgba(42, 126, 88, 0.1)',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: theme.radius,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: theme.radius,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: theme.radius,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: theme.radius,
  },
  laserLine: {
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    marginHorizontal: 12,
  },
  successPulse: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.statusNormal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  maskBottom: {
    flex: 1.2,
    width: '100%',
    backgroundColor: 'rgba(32, 37, 34, 0.45)',
    alignItems: 'center',
    paddingTop: 20,
  },
  hudCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 6,
    ...theme.shadow.card,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
  },
  modeBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
    fontFamily: theme.fontFamily,
  },
});
