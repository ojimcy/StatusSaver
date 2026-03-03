import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, Alert, TouchableOpacity} from 'react-native';
import {Lock, Image} from 'lucide-react-native';
import useStatuses from '../hooks/useStatuses';
import useStatusStore from '../store/useStatusStore';
import useSettingsStore from '../store/useSettingsStore';
import useSAFPermission from '../hooks/useSAFPermission';
import StatusGrid from '../components/StatusGrid';
import SelectionBar from '../components/SelectionBar';
import StatusContextMenu from '../components/StatusContextMenu';
import AdBanner from '../components/AdBanner';
import EmptyState from '../components/EmptyState';
import useTheme from '../hooks/useTheme';
import {saveBatch, saveToGallery, shareFile} from '../services/FileService';
import AdManager from '../services/AdService';
import {spacing, fontSize} from '../theme/spacing';
import type {StatusFile} from '../types';

const HomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {theme} = useTheme();
  const {images, loading, refresh} = useStatuses();
  const {selectedIds, toggleSelection, clearSelection} = useStatusStore();
  const toggleFavorite = useSettingsStore(s => s.toggleFavorite);
  const favoriteIds = useSettingsStore(s => s.favoriteIds);
  const selectionMode = selectedIds.length > 0;
  const {needsPermission, missingVariants, grantAccess} = useSAFPermission();
  const [menuFile, setMenuFile] = useState<StatusFile | null>(null);
  const [menuAnchor, setMenuAnchor] = useState({x: 0, y: 0});

  const handleGrantAccess = useCallback(async () => {
    const granted = await grantAccess();
    if (granted) {
      refresh();
    }
  }, [grantAccess, refresh]);

  const handleItemPress = useCallback(
    (file: StatusFile) => {
      if (selectionMode) {
        toggleSelection(file.id);
      } else {
        navigation.navigate('Viewer', {file});
      }
    },
    [selectionMode, toggleSelection, navigation],
  );

  const handleItemLongPress = useCallback(
    (file: StatusFile, position: {x: number; y: number}) => {
      if (selectionMode) {
        toggleSelection(file.id);
      } else {
        setMenuFile(file);
        setMenuAnchor(position);
      }
    },
    [selectionMode, toggleSelection],
  );

  const closeMenu = useCallback(() => setMenuFile(null), []);

  const handleMenuSelect = useCallback(() => {
    if (menuFile) {
      toggleSelection(menuFile.id);
    }
  }, [menuFile, toggleSelection]);

  const handleMenuSave = useCallback(async () => {
    if (!menuFile) {return;}
    const success = await saveToGallery(menuFile);
    if (success) {
      Alert.alert('Saved', 'Status saved to your gallery.');
    } else {
      Alert.alert('Error', 'Failed to save status. Please try again.');
    }
  }, [menuFile]);

  const handleMenuShare = useCallback(async () => {
    if (!menuFile) {return;}
    await shareFile(menuFile);
  }, [menuFile]);

  const handleMenuFavorite = useCallback(() => {
    if (menuFile) {
      toggleFavorite(menuFile.id);
    }
  }, [menuFile, toggleFavorite]);

  const handleSaveSelected = useCallback(async () => {
    const filesToSave = images.filter(img => selectedIds.includes(img.id));

    // Gate batch save behind rewarded ad
    const adManager = AdManager.getInstance();
    const rewarded = await adManager.showRewarded();
    if (!rewarded) {
      Alert.alert(
        'Watch Ad to Save',
        'Watch a short ad to save multiple items at once. You can always save one at a time from the viewer.',
      );
      return;
    }

    const result = await saveBatch(filesToSave);
    clearSelection();
    Alert.alert(
      'Save Complete',
      `Saved ${result.saved} item${result.saved !== 1 ? 's' : ''}${
        result.failed > 0 ? `. ${result.failed} failed.` : ''
      }`,
    );
  }, [images, selectedIds, clearSelection]);

  const handleShareSelected = useCallback(async () => {
    const filesToShare = images.filter(img => selectedIds.includes(img.id));
    if (filesToShare.length === 1) {
      await shareFile(filesToShare[0]);
    } else {
      Alert.alert('Share', 'Please select only one item to share.');
    }
    clearSelection();
  }, [images, selectedIds, clearSelection]);

  const missingLabel = missingVariants
    .map(v => (v === 'business' ? 'WhatsApp Business' : 'WhatsApp'))
    .join(' & ');

  const renderPermissionBanner = () => {
    if (!needsPermission || images.length === 0) {
      return null;
    }
    return (
      <TouchableOpacity
        style={[styles.permissionBanner, {backgroundColor: theme.accent}]}
        onPress={handleGrantAccess}
        activeOpacity={0.8}>
        <Text style={styles.permissionBannerText}>
          Tap to grant access to {missingLabel} statuses
        </Text>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (!loading && images.length === 0) {
      return (
        <EmptyState
          icon={needsPermission ? <Lock size={64} color={theme.textSecondary} /> : <Image size={64} color={theme.textSecondary} />}
          title={
            needsPermission
              ? 'Storage Access Required'
              : 'No Image Statuses Found'
          }
          subtitle={
            needsPermission
              ? `Grant access to the ${missingLabel} status folder to view and save statuses.`
              : 'Make sure WhatsApp is installed and you have viewed some statuses.'
          }
          actionLabel={needsPermission ? 'Grant Access' : undefined}
          onAction={needsPermission ? handleGrantAccess : undefined}
        />
      );
    }

    return (
      <StatusGrid
        statuses={images}
        onItemPress={handleItemPress}
        onItemLongPress={handleItemLongPress}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        refreshing={loading}
        onRefresh={refresh}
      />
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {renderPermissionBanner()}
      {renderContent()}
      {selectionMode && (
        <SelectionBar
          count={selectedIds.length}
          onSave={handleSaveSelected}
          onShare={handleShareSelected}
          onCancel={clearSelection}
        />
      )}
      <AdBanner />
      <StatusContextMenu
        visible={menuFile !== null}
        anchor={menuAnchor}
        onClose={closeMenu}
        onSelect={handleMenuSelect}
        onSave={handleMenuSave}
        onShare={handleMenuShare}
        onFavorite={handleMenuFavorite}
        isFavorited={menuFile ? favoriteIds.includes(menuFile.id) : false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionBanner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  permissionBannerText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});

export default HomeScreen;
