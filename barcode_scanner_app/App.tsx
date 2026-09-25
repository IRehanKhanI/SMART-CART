import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  Platform,
  useWindowDimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { ScannerOverlay } from './src/components/ScannerOverlay';
import { ResultModal } from './src/components/ResultModal';
import { ManualInputModal } from './src/components/ManualInputModal';
import { NewProductModal } from './src/components/NewProductModal';
import { InventoryView } from './src/components/InventoryView';
import { HistoryView } from './src/components/HistoryView';
import { SettingsView } from './src/components/SettingsView';
import { TopStatusBar } from './src/components/TopStatusBar';
import { SidebarNav } from './src/components/SidebarNav';
import { KpiCards } from './src/components/KpiCards';
import { StoreFloorPlan } from './src/components/StoreFloorPlan';
import { AnalyticsChart } from './src/components/AnalyticsChart';
import { AlertPanel } from './src/components/AlertPanel';
import { CartView } from './src/components/CartView';
import { VoiceSearchView } from './src/components/VoiceSearchView';

import { ScanHistoryItem, ScanMode, ScannerType, AppTab, ProductItem } from './src/types';
import { productDb, findMatchingProduct } from './src/services/productDb';
import { theme } from './src/theme';

export default function App() {
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 860;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const [torch, setTorch] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [scanMode, setScanMode] = useState<ScanMode>('single');
  const [scannerType, setScannerType] = useState<ScannerType>('cart');
  const [pairedCartId, setPairedCartId] = useState<string>('CART-01');

  // Cart summary & toast state
  const [cartSummary, setCartSummary] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  const [cartToast, setCartToast] = useState<{ message: string; submessage?: string } | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const codeCooldownMapRef = useRef<Record<string, number>>({});
  const lastToastTimeRef = useRef<number>(0);

  // Product Database state
  const [productMap, setProductMap] = useState<Record<string, ProductItem>>({});

  // Layout / drawer states
  const [sidebarDrawerVisible, setSidebarDrawerVisible] = useState(false);
  const [alertPanelVisible, setAlertPanelVisible] = useState(false);

  // Modals state
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [newProductModalVisible, setNewProductModalVisible] = useState(false);

  const [activeBarcode, setActiveBarcode] = useState('');
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [currentResult, setCurrentResult] = useState<ScanHistoryItem | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  // Synchronize cartSummary with ground-truth cart session
  const syncCartSummary = async (cartId?: string) => {
    const targetCart = cartId || pairedCartId || 'CART-01';
    try {
      const details = await productDb.getCartDetails(targetCart);
      if (details) {
        setCartSummary({ count: details.itemCount, total: details.total });
      } else {
        setCartSummary({ count: 0, total: 0 });
      }
    } catch (e) {
      console.warn('Could not sync cart summary:', e);
    }
  };

  // Load product database and paired cart on startup
  const refreshProducts = async () => {
    const data = await productDb.getAllProducts();
    setProductMap(data);
    const storedCart = await productDb.getPairedCartId();
    const activeCart = storedCart || 'CART-01';
    if (storedCart) {
      setPairedCartId(storedCart);
    }
    syncCartSummary(activeCart);
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  // Sync cart item count whenever user switches tabs (e.g. from Cart back to Scanner)
  useEffect(() => {
    syncCartSummary(pairedCartId);
  }, [activeTab, pairedCartId]);

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar style="dark" />
        <Text style={styles.permissionText}>Initializing Retail Operations Station...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar style="dark" />
        <View style={styles.permissionCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="camera-outline" size={36} color={theme.colors.accent} />
          </View>
          <Text style={styles.permissionTitle}>Optical Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            Station 01 requires access to the camera subsystem to scan retail barcodes and QR codes in real time.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={styles.permissionBtnText}>Enable Camera Engine</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    const rawBarcode = (result.data || '').trim();
    if (!rawBarcode) return;

    const now = Date.now();
    const lastCode = lastScannedRef.current.code;
    const lastTime = lastScannedRef.current.time;

    // 1. Frame jitter guard: minimum 600ms between any scanner trigger
    if (now - lastTime < 600) {
      return;
    }

    // 2. Continuous Multi-Scan debounce:
    // If scanning the EXACT SAME item in batch mode, enforce a 5.0-second cooldown!
    // This completely prevents the camera from repeatedly scanning and adding the same product
    // while the user is simply holding it in the viewfinder.
    const cooldownUntil = codeCooldownMapRef.current[rawBarcode] || 0;
    if (scanMode === 'batch' && rawBarcode === lastCode && now < cooldownUntil) {
      if (now - lastToastTimeRef.current > 3000) {
        lastToastTimeRef.current = now;
        setCartToast({
          message: 'Item already in cart',
          submessage: 'Aim camera at next item to continue multi-scan',
        });
        setTimeout(() => setCartToast(null), 2500);
      }
      return;
    }

    // Mark 5s cooldown for this barcode
    codeCooldownMapRef.current[rawBarcode] = now + 5000;
    lastScannedRef.current = { code: rawBarcode, time: now };

    if (scanned && scanMode === 'single') return;

    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    // 1. Detect Smart Cart Pairing QR Code (shown on 1.3" OLED)
    if (rawBarcode.startsWith('CART:') || rawBarcode === 'CART-01' || rawBarcode.startsWith('CART-')) {
      const detectedCartId = rawBarcode.replace(/^CART:/, '').trim() || 'CART-01';
      setPairedCartId(detectedCartId);
      productDb.pairCart(detectedCartId);

      setCartToast({
        message: `🛒 Paired with ${detectedCartId}!`,
        submessage: 'Phone synchronized with ESP32 OLED display',
      });
      setTimeout(() => setCartToast(null), 3500);

      Alert.alert(
        '🛒 Smart Cart Paired!',
        `Your phone is now connected to ${detectedCartId} and synchronized with the ESP32 OLED display!`,
        [
          { text: 'Start Scanning Items', onPress: () => { setScanned(false); } },
          { text: 'View Cart', onPress: () => { setActiveTab('cart'); setScanned(false); } },
        ]
      );
      return;
    }

    // Lookup matching product in memory
    const immediateProduct = findMatchingProduct(productMap, rawBarcode);

    const isUrl =
      rawBarcode.startsWith('http://') ||
      rawBarcode.startsWith('https://') ||
      rawBarcode.startsWith('www.');

    const newItem: ScanHistoryItem = {
      id: Date.now().toString(),
      data: rawBarcode,
      type: result.type || 'Barcode',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      isUrl,
      product: immediateProduct || undefined,
    };

    setHistory((prev) => [newItem, ...prev]);
    setCurrentResult(newItem);
    setActiveBarcode(rawBarcode);

    // ==========================================
    // TYPE 1: 🛒 SCAN TO CART (Shopper Mode)
    // ==========================================
    if (scannerType === 'cart') {
      const prodName = immediateProduct?.name || `Item (${rawBarcode.slice(-6)})`;
      const prodPrice = immediateProduct?.price || 50.0;

      // Update cart session on backend (triggers ESP32 OLED update + Bought LED)
      productDb.scanToCart(pairedCartId, rawBarcode).then((cartRes) => {
        if (cartRes) {
          setCartSummary({ count: cartRes.itemCount, total: cartRes.total });
          setCartToast({
            message: `✅ Added ${prodName}`,
            submessage: `₹${prodPrice.toFixed(2)} • Total: ₹${cartRes.total.toFixed(2)} (${cartRes.itemCount} items)`,
          });
        } else {
          setCartSummary((prev) => ({ count: prev.count + 1, total: prev.total + prodPrice }));
          setCartToast({
            message: `✅ Added ${prodName}`,
            submessage: `₹${prodPrice.toFixed(2)} added to Cart session`,
          });
        }
        setTimeout(() => setCartToast(null), 3000);
      });

      if (scanMode === 'single') {
        setScanned(true);
      } else {
        // Continuous / Batch mode: stay live!
        setScanned(false);
      }

      // Background lookup if not found in memory
      if (!immediateProduct) {
        productDb.getProduct(rawBarcode).then((bgProduct) => {
          if (bgProduct) {
            setProductMap((prev) => ({ ...prev, [bgProduct.barcode]: bgProduct }));
          }
        });
      }
      return;
    }

    // ==========================================
    // TYPE 2: 📦 CATALOG / SKU INTAKE (Admin Mode)
    // ==========================================
    if (immediateProduct) {
      setResultModalVisible(true);
    } else {
      // New / Unknown product: directly open registration modal
      setEditingProduct(null);
      setNewProductModalVisible(true);
    }

    if (scanMode === 'single') {
      setScanned(true);
    } else {
      // In batch mode for catalog, keep camera running
      setScanned(false);
    }

    if (!immediateProduct) {
      productDb.getProduct(rawBarcode).then((bgProduct) => {
        if (bgProduct) {
          setProductMap((prev) => ({ ...prev, [bgProduct.barcode]: bgProduct }));
          setCurrentResult((prev) =>
            prev && prev.data === rawBarcode ? { ...prev, product: bgProduct } : prev
          );
        }
      });
    }
  };


  const handleManualSubmit = (code: string, format: string) => {
    const cleanCode = (code || '').trim();
    const immediateProduct = findMatchingProduct(productMap, cleanCode);
    const isUrl = cleanCode.startsWith('http://') || cleanCode.startsWith('https://');

    const newItem: ScanHistoryItem = {
      id: Date.now().toString(),
      data: cleanCode,
      type: format,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      isUrl,
      product: immediateProduct || undefined,
    };

    setHistory((prev) => [newItem, ...prev]);
    setCurrentResult(newItem);
    setActiveBarcode(cleanCode);
    setResultModalVisible(true);

    if (!immediateProduct) {
      productDb.getProduct(cleanCode).then((bgProduct) => {
        if (bgProduct) {
          setProductMap((prev) => ({ ...prev, [bgProduct.barcode]: bgProduct }));
          setCurrentResult((prev) =>
            prev && prev.data === cleanCode ? { ...prev, product: bgProduct } : prev
          );
        }
      });
    }
  };

  const handleSaveProduct = async (product: ProductItem) => {
    await productDb.saveProduct(product);

    // Update local memory state immediately
    setProductMap((prev) => ({ ...prev, [product.barcode]: product }));

    const updatedItem: ScanHistoryItem = {
      id: Date.now().toString(),
      data: product.barcode,
      type: 'Barcode',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      isUrl: product.barcode.startsWith('http://') || product.barcode.startsWith('https://'),
      product: product,
    };

    setCurrentResult(updatedItem);
    setNewProductModalVisible(false);
    setResultModalVisible(true);
  };

  const handleDeleteProduct = async (barcode: string) => {
    await productDb.deleteProduct(barcode);
    await refreshProducts();
  };

  const handleCloseResultModal = () => {
    setResultModalVisible(false);
    setScanned(false);
  };

  const handleNewScanTrigger = () => {
    setResultModalVisible(false);
    setNewProductModalVisible(false);
    setManualModalVisible(false);
    setScanned(false);
  };

  const productList = Object.values(productMap);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.mainContainer}>
        <StatusBar style="dark" />

        {/* Top Status Bar: Store 01 | System Status | Edge Sync | Alerts */}
        <TopStatusBar
          alertCount={2}
          isWideScreen={isWideScreen}
          pairedCartId={pairedCartId}
          onPressCart={() => setActiveTab('cart')}
          onToggleAlerts={() => setAlertPanelVisible(!alertPanelVisible)}
          onToggleSidebar={() => setSidebarDrawerVisible(!sidebarDrawerVisible)}
        />


        {/* Main Body Layout: Sidebar + Content Area + Optional Alert Dock */}
        <View style={styles.bodyLayout}>
          {/* Left Sidebar (Pinned on wide screens) */}
          {isWideScreen && (
            <SidebarNav
              activeTab={activeTab}
              scannerType={scannerType}
              onSelectTab={(tab, type) => {
                setActiveTab(tab);
                if (type) setScannerType(type);
                if (tab === 'scanner') handleNewScanTrigger();
              }}
              productCount={productList.length}
              historyCount={history.length}
            />
          )}

          {/* Left Sidebar Drawer (Collapsible for mobile/tablet screens) */}
          {!isWideScreen && sidebarDrawerVisible && (
            <View style={styles.drawerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setSidebarDrawerVisible(false)}
              />
              <SidebarNav
                activeTab={activeTab}
                scannerType={scannerType}
                onSelectTab={(tab, type) => {
                  setActiveTab(tab);
                  if (type) setScannerType(type);
                  setSidebarDrawerVisible(false);
                  if (tab === 'scanner') handleNewScanTrigger();
                }}
                onClose={() => setSidebarDrawerVisible(false)}
                isDrawer
                productCount={productList.length}
                historyCount={history.length}
              />
            </View>
          )}

          {/* Content Workspace */}
          <View style={styles.contentArea}>
            {/* TAB 1: OVERVIEW (Command Dashboard with Floor Plan, Compact KPIs & Analytics) */}
            {activeTab === 'overview' && (
              <ScrollView
                style={styles.overviewScroll}
                contentContainerStyle={styles.overviewContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Compact KPI Cards: Footfall, Stock, Queue, Alerts */}
                <KpiCards
                  productCount={productList.length}
                  alertCount={2}
                  scanCount={history.length}
                />

                {/* Station 01 Quick Action Bar */}
                <View style={styles.quickStationCard}>
                  <View style={styles.quickStationInfo}>
                    <View style={styles.stationBadgeRow}>
                      <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
                      <Text style={styles.quickStationTitle}>STATION 01 OPTICAL INTAKE</Text>
                    </View>
                    <Text style={styles.quickStationSub}>
                      {activeBarcode
                        ? `Active code registered: ${activeBarcode}`
                        : 'Camera sensor ready for shopper cart scanning & inventory catalog intake.'}
                    </Text>
                  </View>

                  <View style={styles.quickStationActions}>
                    <TouchableOpacity
                      style={styles.openScannerBtn}
                      onPress={() => {
                        setActiveTab('scanner');
                        handleNewScanTrigger();
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="scan" size={16} color={theme.colors.textInverse} />
                      <Text style={styles.openScannerBtnText}>Open Viewfinder</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.manualEntryBtn}
                      onPress={() => setManualModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="keypad-outline" size={16} color={theme.colors.textPrimary} />
                      <Text style={styles.manualEntryBtnText}>Manual Code</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Main Visual: Architectural Live Store Floor Plan */}
                <StoreFloorPlan
                  lastScannedCode={activeBarcode}
                  onZoneSelect={() => {}}
                />

                {/* Analytics Section: Simple charts for scan throughput & traffic */}
                <AnalyticsChart scanCount={history.length} />
              </ScrollView>
            )}

            {/* TAB 2: SCANNER (Live Camera Viewfinder + 2 Scanner Modes + Single/Multi HUD) */}
            {activeTab === 'scanner' && (
              <View style={styles.cameraContainer}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  enableTorch={torch}
                  onBarcodeScanned={scanned && scanMode === 'single' ? undefined : handleBarcodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: [
                      'qr',
                      'ean13',
                      'ean8',
                      'upc_a',
                      'upc_e',
                      'code128',
                      'code39',
                      'code93',
                      'datamatrix',
                      'pdf417',
                      'aztec',
                      'itf14',
                    ],
                  }}
                />

                {/* Operational Reticle Scanner Overlay */}
                <ScannerOverlay
                  scanned={scanned}
                  scanMode={scanMode}
                  scannerType={scannerType}
                />

                {/* Top Camera Controls & Scanner Type / Mode Selector */}
                <View style={styles.topHudContainer}>
                  {/* Row 1: Action Buttons */}
                  <View style={styles.topHudRow}>
                    <TouchableOpacity
                      style={styles.hudBtn}
                      onPress={() => setManualModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="keypad-outline" size={16} color={theme.colors.textPrimary} />
                      <Text style={styles.hudBtnText}>Manual Entry</Text>
                    </TouchableOpacity>

                    <View style={styles.hudRightGroup}>
                      <TouchableOpacity
                        style={[styles.hudBtn, torch && styles.hudBtnActive]}
                        onPress={() => setTorch(!torch)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={torch ? 'flash' : 'flash-outline'}
                          size={16}
                          color={torch ? theme.colors.textInverse : theme.colors.textPrimary}
                        />
                        <Text style={[styles.hudBtnText, torch && styles.hudBtnTextActive]}>
                          {torch ? 'Torch On' : 'Torch Off'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.hudBtn}
                        onPress={() => setActiveTab('overview')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="grid-outline" size={16} color={theme.colors.textPrimary} />
                        <Text style={styles.hudBtnText}>Dashboard</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Row 2: Scanner Type & Single/Multi Mode Switcher */}
                  <View style={styles.scannerSelectorBar}>
                    {/* Scanner Type Toggle: Cart vs Catalog */}
                    <View style={styles.segmentedBox}>
                      <TouchableOpacity
                        style={[
                          styles.segmentBtn,
                          scannerType === 'cart' && styles.segmentBtnActiveCart,
                        ]}
                        onPress={() => {
                          setScannerType('cart');
                          setScanned(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="cart"
                          size={13}
                          color={scannerType === 'cart' ? '#fff' : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.segmentBtnText,
                            scannerType === 'cart' && styles.segmentBtnTextActive,
                          ]}
                        >
                          Scan to Cart
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.segmentBtn,
                          scannerType === 'catalog' && styles.segmentBtnActiveCatalog,
                        ]}
                        onPress={() => {
                          setScannerType('catalog');
                          setScanned(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="barcode"
                          size={13}
                          color={scannerType === 'catalog' ? '#fff' : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.segmentBtnText,
                            scannerType === 'catalog' && styles.segmentBtnTextActive,
                          ]}
                        >
                          Add/Edit SKU
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Mode Toggle: Single vs Continuous Batch Multi-Scan */}
                    <View style={styles.segmentedBox}>
                      <TouchableOpacity
                        style={[
                          styles.segmentBtn,
                          scanMode === 'single' && styles.segmentBtnActiveMode,
                        ]}
                        onPress={() => {
                          setScanMode('single');
                          setScanned(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="flash"
                          size={12}
                          color={scanMode === 'single' ? '#fff' : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.segmentBtnText,
                            scanMode === 'single' && styles.segmentBtnTextActive,
                          ]}
                        >
                          Single
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.segmentBtn,
                          scanMode === 'batch' && styles.segmentBtnActiveMode,
                        ]}
                        onPress={() => {
                          setScanMode('batch');
                          setScanned(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="repeat"
                          size={12}
                          color={scanMode === 'batch' ? '#fff' : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.segmentBtnText,
                            scanMode === 'batch' && styles.segmentBtnTextActive,
                          ]}
                        >
                          Multi-Scan
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Instant Feedback Toast for Cart Scans */}
                {cartToast && (
                  <View style={styles.cartToastCard}>
                    <View style={styles.toastIconBox}>
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.statusNormal} />
                    </View>
                    <View style={styles.toastTextBox}>
                      <Text style={styles.cartToastTitle}>{cartToast.message}</Text>
                      {cartToast.submessage && (
                        <Text style={styles.cartToastSub}>{cartToast.submessage}</Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Floating Bottom Dock for Cart Mode */}
                {scannerType === 'cart' && (
                  <View style={styles.cartFloatingDock}>
                    <View style={styles.cartDockLeft}>
                      <View style={styles.cartIconCircle}>
                        <Ionicons name="cart" size={18} color="#fff" />
                      </View>
                      <View>
                        <Text style={styles.cartDockTitle}>
                          {cartSummary.count} {cartSummary.count === 1 ? 'item' : 'items'} in Cart
                        </Text>
                        <Text style={styles.cartDockSub}>
                          Total: ₹{cartSummary.total.toFixed(2)} • {scanMode === 'single' ? 'Single Scan' : 'Multi-Scan (Live)'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cartDockRight}>
                      {scanned && scanMode === 'single' && (
                        <TouchableOpacity
                          style={styles.cartDockNextBtn}
                          onPress={handleNewScanTrigger}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="scan" size={14} color="#fff" />
                          <Text style={styles.cartDockNextBtnText}>Scan Next</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.cartDockViewBtn}
                        onPress={() => setActiveTab('cart')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.cartDockViewBtnText}>View Cart</Text>
                        <Ionicons name="arrow-forward" size={13} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Floating "ACTIVATE NEXT SKU SCAN" Button for Catalog Mode */}
                {scannerType === 'catalog' && scanned && !resultModalVisible && !newProductModalVisible && (
                  <View style={styles.newScanFloatingContainer}>
                    <TouchableOpacity
                      style={styles.newScanBtn}
                      onPress={handleNewScanTrigger}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="scan" size={18} color={theme.colors.textInverse} />
                      <Text style={styles.newScanBtnText}>ACTIVATE NEXT SKU SCAN</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

          {/* TAB: SMART CART (LIVE SYNC WITH ESP32) */}
          {activeTab === 'cart' && (
            <CartView
              pairedCartId={pairedCartId}
              onNavigateToScan={() => {
                setActiveTab('scanner');
                handleNewScanTrigger();
              }}
              onCartUpdated={(summary) => setCartSummary(summary)}
            />
          )}

          {/* TAB: VOICE & ITEM SEARCH (WITH SHELF DIRECTIONS) */}
          {activeTab === 'search' && (
            <VoiceSearchView
              pairedCartId={pairedCartId}
              onItemAddedToCart={(name) => {
                syncCartSummary(pairedCartId);
                if (hapticEnabled && Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                }
              }}
            />
          )}

          {/* TAB: PRODUCTS (Tables for Inventory) */}
          {activeTab === 'products' && (
            <InventoryView
              products={productList}
              onEditProduct={(p) => {
                setActiveBarcode(p.barcode);
                setEditingProduct(p);
                setNewProductModalVisible(true);
              }}
              onDeleteProduct={handleDeleteProduct}
              onAddCustomProduct={() => {
                const randomCode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
                setActiveBarcode(randomCode);
                setEditingProduct(null);
                setNewProductModalVisible(true);
              }}
            />
          )}

          {/* TAB: HISTORY (Scan Audit Log Table) */}
          {activeTab === 'history' && (
            <HistoryView
              history={history}
              onSelectItem={(item) => {
                setCurrentResult(item);
                setResultModalVisible(true);
              }}
              onClearHistory={() => setHistory([])}
              onDeleteItem={(id) => setHistory(history.filter((h) => h.id !== id))}
            />
          )}

          {/* TAB: SETTINGS (Operational Configuration) */}
          {activeTab === 'settings' && (
            <SettingsView
              hapticEnabled={hapticEnabled}
              setHapticEnabled={setHapticEnabled}
              scanMode={scanMode}
              setScanMode={setScanMode}
              torch={torch}
              setTorch={setTorch}
            />
          )}
        </View>

        {/* Right Alert Panel (Docked on wide screen if toggled or shown as overlay) */}
        {alertPanelVisible && (
          <View style={isWideScreen ? styles.rightDockContainer : styles.alertModalOverlay}>
            {!isWideScreen && (
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setAlertPanelVisible(false)}
              />
            )}
            <AlertPanel
              onClose={() => setAlertPanelVisible(false)}
              isFloating={!isWideScreen}
            />
          </View>
        )}
      </View>

      {/* Bottom Command Navigation (for mobile screens) */}
      {!isWideScreen && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navTab}
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'overview' ? 'grid' : 'grid-outline'}
              size={18}
              color={activeTab === 'overview' ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'overview' && styles.navTabTextActive,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTab}
            onPress={() => {
              setActiveTab('scanner');
              handleNewScanTrigger();
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'scanner' ? 'scan' : 'scan-outline'}
              size={18}
              color={activeTab === 'scanner' ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'scanner' && styles.navTabTextActive,
              ]}
            >
              Scan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTab}
            onPress={() => setActiveTab('cart')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'cart' ? 'cart' : 'cart-outline'}
              size={18}
              color={activeTab === 'cart' ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'cart' && styles.navTabTextActive,
              ]}
            >
              Cart
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTab}
            onPress={() => setActiveTab('search')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'search' ? 'search' : 'search-outline'}
              size={18}
              color={activeTab === 'search' ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'search' && styles.navTabTextActive,
              ]}
            >
              Search
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTab}
            onPress={() => setActiveTab('products')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'products' ? 'cube' : 'cube-outline'}
              size={18}
              color={activeTab === 'products' ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'products' && styles.navTabTextActive,
              ]}
            >
              Inventory
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTab}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'settings' ? 'options' : 'options-outline'}
              size={18}
              color={activeTab === 'settings' ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.navTabText,
                activeTab === 'settings' && styles.navTabTextActive,
              ]}
            >
              Config
            </Text>
          </TouchableOpacity>
        </View>
      )}


      {/* Result Inspector Modal */}
      <ResultModal
        visible={resultModalVisible}
        item={currentResult}
        onClose={handleCloseResultModal}
        onRegisterProduct={(code) => {
          setActiveBarcode(code);
          setEditingProduct(null);
          setResultModalVisible(false);
          setNewProductModalVisible(true);
        }}
        onEditProduct={() => {
          if (currentResult?.product) {
            setActiveBarcode(currentResult.product.barcode);
            setEditingProduct(currentResult.product);
            setResultModalVisible(false);
            setNewProductModalVisible(true);
          }
        }}
      />

      {/* Manual Entry Modal */}
      <ManualInputModal
        visible={manualModalVisible}
        onClose={() => setManualModalVisible(false)}
        onSubmit={handleManualSubmit}
      />

      {/* New / Edit Product Modal */}
      <NewProductModal
        visible={newProductModalVisible}
        barcode={activeBarcode}
        existingProduct={editingProduct}
        onClose={() => {
          setNewProductModalVisible(false);
          setScanned(false);
        }}
        onSave={handleSaveProduct}
      />
    </SafeAreaView>
  </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  bodyLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  contentArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  overviewScroll: {
    flex: 1,
  },
  overviewContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  quickStationCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    ...theme.shadow.card,
  },
  quickStationInfo: {
    flex: 1,
    minWidth: 200,
  },
  stationBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  quickStationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
  },
  quickStationSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  quickStationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openScannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius,
  },
  openScannerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
    fontFamily: theme.fontFamily,
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius,
  },
  manualEntryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(32, 37, 34, 0.4)',
    zIndex: 90,
  },
  rightDockContainer: {
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  alertModalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(32, 37, 34, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 20,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontFamily: theme.fontFamily,
  },
  permissionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: 360,
    ...theme.shadow.modal,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: theme.fontFamily,
  },
  permissionDesc: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    fontFamily: theme.fontFamily,
  },
  permissionBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: theme.radius,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fontFamily,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  topHudContainer: {
    position: 'absolute',
    top: 14,
    left: 12,
    right: 12,
    zIndex: 10,
    gap: 8,
  },
  topHudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  segmentedBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 24, 22, 0.82)',
    borderRadius: theme.radii.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
  },
  segmentBtnActiveCart: {
    backgroundColor: theme.colors.accent,
  },
  segmentBtnActiveCatalog: {
    backgroundColor: '#2563EB',
  },
  segmentBtnActiveMode: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
    fontFamily: theme.fontFamily,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cartToastCard: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.statusNormal,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 50,
    ...theme.shadow.modal,
  },
  toastIconBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTextBox: {
    flex: 1,
  },
  cartToastTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    fontFamily: theme.fontFamily,
  },
  cartToastSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: theme.fontFamily,
  },
  cartFloatingDock: {
    position: 'absolute',
    bottom: 20,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: theme.radii.xl,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    zIndex: 30,
    ...theme.shadow.modal,
  },
  cartDockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cartIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartDockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    fontFamily: theme.fontFamily,
  },
  cartDockSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
    fontFamily: theme.fontFamily,
  },
  cartDockRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartDockNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
  },
  cartDockNextBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  cartDockViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
  },
  cartDockViewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  hudRightGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  hudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  hudBtnActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  hudBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fontFamily,
  },
  hudBtnTextActive: {
    color: theme.colors.textInverse,
  },
  newScanFloatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  newScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radius,
    ...theme.shadow.modal,
  },
  newScanBtnText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  navTabText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    fontFamily: theme.fontFamily,
  },
  navTabTextActive: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: {
    color: theme.colors.textPrimary,
    fontSize: 9,
    fontWeight: '700',
  },
});
