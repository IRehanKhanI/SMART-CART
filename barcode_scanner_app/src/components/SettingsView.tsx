import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanMode } from '../types';
import { theme } from '../theme';
import { productDb } from '../services/productDb';

interface SettingsViewProps {
  hapticEnabled: boolean;
  setHapticEnabled: (val: boolean) => void;
  scanMode: ScanMode;
  setScanMode: (mode: ScanMode) => void;
  torch: boolean;
  setTorch: (val: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  hapticEnabled,
  setHapticEnabled,
  scanMode,
  setScanMode,
  torch,
  setTorch,
}) => {
  const [serverUrl, setServerUrl] = useState('http://192.168.137.1:8000');
  const [cartId, setCartId] = useState('CART-01');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    productDb.getStoredServerUrl().then(setServerUrl);
    productDb.getPairedCartId().then(setCartId);
  }, []);

  const handleSaveServer = async () => {
    setIsTesting(true);
    try {
      await productDb.setCustomServer(serverUrl);
      const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/products/`, { method: 'GET' });
      if (res.ok) {
        Alert.alert('✅ Connected Successfully!', `Connected to Django Backend at ${serverUrl}`);
      } else {
        Alert.alert('⚠️ Server Responded', `HTTP ${res.status}: Saved URL ${serverUrl}`);
      }
    } catch (e) {
      Alert.alert('Connection Notice', `Saved ${serverUrl}. Ensure computer and phone are on the same Wi-Fi.`);
    } finally {
      setIsTesting(false);
    }
  };

  const handlePairCart = async () => {
    await productDb.pairCart(cartId);
    Alert.alert('🛒 Cart Paired', `Now connected to ${cartId}!`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>SYSTEM CONFIGURATION</Text>
        <Text style={styles.subtitle}>
          Operational parameters for Station 01 Edge Optical Scanner & Smart Cart
        </Text>
      </View>

      {/* Backend & Smart Cart Connection Group */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>DJANGO BACKEND & CART SYNC</Text>
        
        <View style={styles.configCard}>
          <Text style={styles.configLabel}>Django Backend Server URL</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.137.1:8000"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveServer} disabled={isTesting}>
              <Text style={styles.saveBtnText}>{isTesting ? 'Testing...' : 'Save & Test'}</Text>
            </TouchableOpacity>
          </View>

          {/* Quick preset chips */}
          <View style={styles.presetRow}>
            <Text style={styles.presetLabel}>Presets:</Text>
            <TouchableOpacity onPress={() => setServerUrl('http://192.168.137.1:8000')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>Hotspot (192.168.137.1)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setServerUrl('http://10.1.7.65:8000')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>Campus (10.1.7.65)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setServerUrl('http://127.0.0.1:8000')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>Local (127.0.0.1)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerLine} />

          <Text style={styles.configLabel}>Active Smart Cart ID</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={cartId}
              onChangeText={setCartId}
              placeholder="CART-01"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.pairBtn} onPress={handlePairCart}>
              <Ionicons name="link-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.pairBtnText}>Pair</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>


      {/* Scanner Behavior Group */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>OPTICAL SCANNER BEHAVIOR</Text>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Ionicons
              name="flash-outline"
              size={18}
              color={theme.colors.textPrimary}
              style={styles.rowIcon}
            />
            <View>
              <Text style={styles.rowLabel}>Camera Illuminator (Torch)</Text>
              <Text style={styles.rowSublabel}>LED auxiliary light for low-light shelf scans</Text>
            </View>
          </View>
          <Switch
            value={torch}
            onValueChange={setTorch}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentLight }}
            thumbColor={torch ? theme.colors.accent : theme.colors.surface}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Ionicons
              name="phone-portrait-outline"
              size={18}
              color={theme.colors.textPrimary}
              style={styles.rowIcon}
            />
            <View>
              <Text style={styles.rowLabel}>Haptic Confirmation</Text>
              <Text style={styles.rowSublabel}>Vibration pulse on successful barcode decode</Text>
            </View>
          </View>
          <Switch
            value={hapticEnabled}
            onValueChange={setHapticEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentLight }}
            thumbColor={hapticEnabled ? theme.colors.accent : theme.colors.surface}
          />
        </View>

        {/* Capture Mode */}
        <View style={styles.rowColumn}>
          <View style={styles.rowInfo}>
            <Ionicons
              name="layers-outline"
              size={18}
              color={theme.colors.textPrimary}
              style={styles.rowIcon}
            />
            <View>
              <Text style={styles.rowLabel}>Capture Intake Mode</Text>
              <Text style={styles.rowSublabel}>Select barcode intake operational mode</Text>
            </View>
          </View>

          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                scanMode === 'single' && styles.modeBtnActive,
              ]}
              onPress={() => setScanMode('single')}
              activeOpacity={0.8}
            >
              <View style={styles.modeBtnHeader}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        scanMode === 'single'
                          ? theme.colors.accent
                          : theme.colors.borderDark,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    scanMode === 'single' && styles.modeBtnTextActive,
                  ]}
                >
                  Single Scan
                </Text>
              </View>
              <Text style={styles.modeDesc}>Inspects and prompts after every barcode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeBtn,
                scanMode === 'batch' && styles.modeBtnActive,
              ]}
              onPress={() => setScanMode('batch')}
              activeOpacity={0.8}
            >
              <View style={styles.modeBtnHeader}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        scanMode === 'batch'
                          ? theme.colors.accent
                          : theme.colors.borderDark,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    scanMode === 'batch' && styles.modeBtnTextActive,
                  ]}
                >
                  Continuous Batch
                </Text>
              </View>
              <Text style={styles.modeDesc}>Rapid successive intake without popups</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Supported Formats */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>SUPPORTED BARCODE SYMBOLOGIES</Text>

        <View style={styles.formatGrid}>
          {[
            'QR Code',
            'EAN-13',
            'EAN-8',
            'UPC-A',
            'UPC-E',
            'Code 128',
            'Code 39',
            'Data Matrix',
            'PDF417',
            'Aztec',
          ].map((fmt) => (
            <View key={fmt} style={styles.formatTag}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
              <Text style={styles.formatTagText}>{fmt}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Edge & Network Info */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>EDGE WORKSTATION METADATA</Text>
        <View style={styles.aboutCard}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutKey}>Subsystem:</Text>
            <Text style={styles.aboutVal}>Retail Operations Command Edge Station</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutKey}>Node Version:</Text>
            <Text style={styles.aboutVal}>v1.0.0 (Release 2026.09)</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutKey}>Backend Bridge:</Text>
            <Text style={styles.aboutVal}>Django REST · 10.1.9.166 / localhost:8000</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutKey}>Engine Architecture:</Text>
            <Text style={styles.aboutVal}>Expo Camera Subsystem 57</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 18,
    paddingBottom: 80,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.6,
    fontFamily: theme.fontFamily,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
    marginTop: 2,
  },
  group: {
    marginBottom: 22,
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    fontFamily: theme.fontFamily,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    ...theme.shadow.card,
  },
  rowColumn: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    ...theme.shadow.card,
  },
  rowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  rowSublabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontFamily: theme.fontFamily,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeBtnActive: {
    backgroundColor: theme.colors.accentSubtle,
    borderColor: theme.colors.accent,
  },
  modeBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  modeBtnTextActive: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  modeDesc: {
    fontSize: 10,
    color: theme.colors.textMuted,
    lineHeight: 14,
    fontFamily: theme.fontFamily,
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  formatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  formatTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  aboutCard: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadow.card,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutKey: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
  aboutVal: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  configCard: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
    fontFamily: theme.fontFamily,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  saveBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  pairBtn: {
    backgroundColor: theme.colors.statusNormal,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: theme.radius,
  },
  pairBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  presetLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
  presetChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius,
  },
  presetChipText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  dividerLine: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
  },
});

