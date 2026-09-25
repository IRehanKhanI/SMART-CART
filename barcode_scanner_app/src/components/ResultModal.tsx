import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Clipboard,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanHistoryItem } from '../types';
import { theme } from '../theme';

interface ResultModalProps {
  visible: boolean;
  item: ScanHistoryItem | null;
  onClose: () => void;
  onRegisterProduct?: (barcode: string) => void;
  onEditProduct?: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  visible,
  item,
  onClose,
  onRegisterProduct,
  onEditProduct,
}) => {
  const [fullImageVisible, setFullImageVisible] = useState(false);

  if (!item) return null;

  const product = item.product;

  const handleCopy = () => {
    Clipboard.setString(item.data);
    Alert.alert('Copied', 'Barcode content copied to clipboard.');
  };

  const handleOpenUrl = async () => {
    if (item.isUrl) {
      try {
        const canOpen = await Linking.canOpenURL(item.data);
        if (canOpen) {
          await Linking.openURL(item.data);
        } else {
          Alert.alert('Invalid URL', 'Cannot open link: ' + item.data);
        }
      } catch (err) {
        Alert.alert('Error', 'Unable to launch URL');
      }
    }
  };

  const handleSearchWeb = () => {
    const query = product ? product.name : item.data;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    Linking.openURL(searchUrl);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.type.toUpperCase()}</Text>
              </View>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeHeaderBtn}
            >
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Registered Product Real Card */}
          {product ? (
            <View style={styles.productCard}>
              <TouchableOpacity
                onPress={() => setFullImageVisible(true)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: product.imageUri }}
                  style={styles.productImg}
                  resizeMode="cover"
                />
              </TouchableOpacity>

              <View style={styles.productDetails}>
                <View style={styles.verifiedRow}>
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
                  <Text style={styles.verifiedText}>REGISTERED PRODUCT MATCH</Text>
                </View>

                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.barcodeLabel}>Barcode: {product.barcode}</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Unit Price:</Text>
                  <Text style={styles.priceValue}>₹{product.price.toFixed(2)}</Text>
                </View>
              </View>

              {onEditProduct && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={onEditProduct}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="pencil-outline" size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* Unregistered Barcode Box */
            <View style={styles.unregisteredCard}>
              <View style={styles.unregisteredHeader}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.statusAttention }]} />
                <Text style={styles.unregisteredTitle}>NEW BARCODE DETECTED</Text>
              </View>

              <Text style={styles.codeText} selectable>
                {item.data}
              </Text>
              <Text style={styles.codeSub}>
                This SKU is not yet recorded in the local product catalogue.
              </Text>

              <TouchableOpacity
                style={styles.registerBtn}
                onPress={() => {
                  onClose();
                  if (onRegisterProduct) onRegisterProduct(item.data);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.textInverse} />
                <Text style={styles.registerBtnText}>Add SKU to Product Database</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
              <Ionicons name="copy-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.actionBtnText}>Copy Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleSearchWeb}>
              <Ionicons name="search-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.actionBtnText}>Search Web</Text>
            </TouchableOpacity>

            {item.isUrl && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnHighlight]}
                onPress={handleOpenUrl}
              >
                <Ionicons name="open-outline" size={16} color={theme.colors.accent} />
                <Text style={[styles.actionBtnText, styles.actionBtnTextHighlight]}>
                  Open URL
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dismiss / Scan Next Action */}
          <TouchableOpacity style={styles.scanNextBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.scanNextBtnText}>Scan Next Barcode</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Full Image Preview Modal */}
      {product && (
        <Modal
          visible={fullImageVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullImageVisible(false)}
        >
          <TouchableOpacity
            style={styles.fullImageOverlay}
            activeOpacity={1}
            onPress={() => setFullImageVisible(false)}
          >
            <View style={styles.fullImageCard}>
              <Image
                source={{ uri: product.imageUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <Text style={styles.fullImageTitle}>{product.name}</Text>
              <Text style={styles.fullImagePrice}>₹{product.price.toFixed(2)}</Text>
              <Text style={styles.fullImageSub}>Tap anywhere to close</Text>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 37, 34, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.modal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
  closeHeaderBtn: {
    padding: 4,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    position: 'relative',
  },
  productImg: {
    width: 76,
    height: 76,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  productDetails: {
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.statusNormal,
    letterSpacing: 0.4,
    fontFamily: theme.fontFamily,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
    marginBottom: 2,
  },
  barcodeLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  editBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  unregisteredCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 14,
    marginBottom: 16,
  },
  unregisteredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  unregisteredTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.statusAttention,
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
    marginBottom: 4,
  },
  codeSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
    marginBottom: 12,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    borderRadius: theme.radius,
  },
  registerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
    fontFamily: theme.fontFamily,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 9,
    borderRadius: theme.radius,
  },
  actionBtnHighlight: {
    borderColor: theme.colors.borderDark,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  actionBtnTextHighlight: {
    fontWeight: '600',
    color: theme.colors.accent,
  },
  scanNextBtn: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    borderRadius: theme.radius,
    alignItems: 'center',
  },
  scanNextBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 37, 34, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fullImageCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 20,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fullImage: {
    width: '100%',
    height: 240,
    borderRadius: theme.radius,
    marginBottom: 12,
  },
  fullImageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
    marginBottom: 4,
    textAlign: 'center',
  },
  fullImagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.accent,
    fontFamily: theme.fontFamily,
    marginBottom: 8,
  },
  fullImageSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
});
