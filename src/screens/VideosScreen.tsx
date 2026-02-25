import React, {useCallback} from 'react';
import {View, Text, StyleSheet, Alert, TouchableOpacity} from 'react-native';
import useStatuses from '../hooks/useStatuses';
import useStatusStore from '../store/useStatusStore';
import useSAFPermission from '../hooks/useSAFPermission';
import StatusGrid from '../components/StatusGrid';
import SelectionBar from '../components/SelectionBar';
import AdBanner from '../components/AdBanner';
import EmptyState from '../components/EmptyState';
import useTheme from '../hooks/useTheme';
import {saveBatch, shareFile} from '../services/FileService';
import {spacing, fontSize} from '../theme/spacing';
import type {StatusFile} from '../types';

const VideosScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {theme} = useTheme();
  const {videos, loading, refresh} = useStatuses();
  const {selectedIds, toggleSelection, clearSelection} = useStatusStore();
  const selectionMode = selectedIds.length > 0;
  const {needsPermission, missingVariants, grantAccess} = useSAFPermission();

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
    (file: StatusFile) => {
      if (!selectionMode) {
        toggleSelection(file.id);
      }
    },
    [selectionMode, toggleSelection],
  );

  const handleSaveSelected = useCallback(async () => {
    const filesToSave = videos.filter(v => selectedIds.includes(v.id));
    const result = await saveBatch(filesToSave);
    clearSelection();
    Alert.alert(
      'Save Complete',
      `Saved ${result.saved} item${result.saved !== 1 ? 's' : ''}${
        result.failed > 0 ? `. ${result.failed} failed.` : ''
      }`,
    );
  }, [videos, selectedIds, clearSelection]);

  const handleShareSelected = useCallback(async () => {
    const filesToShare = videos.filter(v => selectedIds.includes(v.id));
    if (filesToShare.length === 1) {
      await shareFile(filesToShare[0]);
    } else {
      Alert.alert('Share', 'Please select only one item to share.');
    }
    clearSelection();
  }, [videos, selectedIds, clearSelection]);

  const missingLabel = missingVariants
    .map(v => (v === 'business' ? 'WhatsApp Business' : 'WhatsApp'))
    .join(' & ');

  const renderPermissionBanner = () => {
    if (!needsPermission || videos.length === 0) {
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
    if (!loading && videos.length === 0) {
      return (
        <EmptyState
          icon={needsPermission ? '\u{1F512}' : '\u{1F3AC}'}
          title={
            needsPermission
              ? 'Storage Access Required'
              : 'No Video Statuses Found'
          }
          subtitle={
            needsPermission
              ? `Grant access to the ${missingLabel} status folder to view and save statuses.`
              : 'Video statuses from your contacts will appear here.'
          }
          actionLabel={needsPermission ? 'Grant Access' : undefined}
          onAction={needsPermission ? handleGrantAccess : undefined}
        />
      );
    }

    return (
      <StatusGrid
        statuses={videos}
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

export default VideosScreen;
