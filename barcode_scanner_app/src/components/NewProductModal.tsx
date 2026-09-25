import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ProductItem } from '../types';
import { theme } from '../theme';

interface NewProductModalProps {
  visible: boolean;
  barcode: string;
  existingProduct?: ProductItem | null;
  onClose: () => void;
  onSave: (product: ProductItem) => void;
}

const PRESET_REAL_PRODUCTS = [
  { name: 'Dairy Milk', url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800' },
  { name: 'Soft Drink', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800' },
  { name: 'Crisp Snacks', url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800' },
  { name: 'Coffee Beans', url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800' },
  { name: 'Chocolate', url: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800' },
  { name: 'Smartphone', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800' },
  { name: 'Sneakers', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800' },
  { name: 'Skincare', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800' },
];

export const NewProductModal: React.FC<NewProductModalProps> = ({
  visible,
  barcode,
  existingProduct,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [imageUri, setImageUri] = useState(PRESET_REAL_PRODUCTS[0].url);

  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name);
      setPrice(existingProduct.price.toString());
      setImageUri(existingProduct.imageUri);
    } else {
      setName('');
      setPrice('');
      setImageUri(PRESET_REAL_PRODUCTS[0].url);
    }
  }, [existingProduct, visible]);

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Gallery permission is needed to select product photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const finalUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setImageUri(finalUri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is needed to take product photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const finalUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setImageUri(finalUri);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a product name.');
      return;
    }

    const numPrice = parseFloat(price.trim());
    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price number.');
      return;
    }

    const product: ProductItem = {
      barcode,
      name: name.trim(),
      price: numPrice,
      imageUri: imageUri || PRESET_REAL_PRODUCTS[0].url,
      createdAt: existingProduct?.createdAt || new Date().toISOString(),
    };

    onSave(product);
    onClose();
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
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  {existingProduct ? 'EDIT PRODUCT RECORD' : 'REGISTER PRODUCT TO CATALOGUE'}
                </Text>
                <Text style={styles.barcodeText}>SKU Code: {barcode}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Product Image Section */}
            <Text style={styles.fieldLabel}>PRODUCT PHOTO</Text>
            <View style={styles.imageSection}>
              <Image
                source={{ uri: imageUri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />

              <View style={styles.imageBtnGroup}>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={handleTakePhoto}>
                  <Ionicons name="camera-outline" size={16} color={theme.colors.textPrimary} />
                  <Text style={styles.imageBtnText}>Capture Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.imagePickerBtn} onPress={handlePickFromGallery}>
                  <Ionicons name="images-outline" size={16} color={theme.colors.textPrimary} />
                  <Text style={styles.imageBtnText}>Gallery Photo</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sample Preset Thumbnails */}
            <Text style={styles.fieldLabel}>OR SELECT PRESET PHOTO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
              {PRESET_REAL_PRODUCTS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.presetThumbContainer,
                    imageUri === item.url && styles.presetActive,
                  ]}
                  onPress={() => setImageUri(item.url)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.url }} style={styles.presetThumb} resizeMode="cover" />
                  <Text style={styles.presetLabel} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Name Field */}
            <Text style={styles.fieldLabel}>PRODUCT NAME / DESCRIPTION</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Coca-Cola 500ml Bottle"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Price Field */}
            <Text style={styles.fieldLabel}>UNIT PRICE (₹)</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 45.00"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            {/* Actions */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>
                  {existingProduct ? 'Save Changes' : 'Register Product'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 37, 34, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.modal,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.6,
    fontFamily: theme.fontFamily,
  },
  barcodeText: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: theme.fontFamily,
  },
  closeBtn: {
    padding: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
    fontFamily: theme.fontFamily,
  },
  imageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imagePreview: {
    width: 68,
    height: 68,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  imageBtnGroup: {
    flex: 1,
    gap: 6,
  },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  presetRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  presetThumbContainer: {
    padding: 3,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    width: 58,
  },
  presetActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSubtle,
  },
  presetThumb: {
    width: 50,
    height: 50,
    borderRadius: theme.radius - 2,
  },
  presetLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontFamily: theme.fontFamily,
  },
  inputBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
  },
  input: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    borderRadius: theme.radius,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
    fontFamily: theme.fontFamily,
  },
});
