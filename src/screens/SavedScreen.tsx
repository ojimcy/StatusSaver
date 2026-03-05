import React, {useState, useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {Download} from 'lucide-react-native';
import StatusGrid from '../components/StatusGrid';
import EmptyState from '../components/EmptyState';
import AdBanner from '../components/AdBanner';
import useTheme from '../hooks/useTheme';
import {requestStoragePermission} from '../services/PermissionService';
import type {StatusFile} from '../types';

const SavedScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {theme} = useTheme();
  const [savedStatuses, setSavedStatuses] = useState<StatusFile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure we have read permission before querying gallery
      await requestStoragePermission();

      // Try album-specific query first
      let result = await CameraRoll.getPhotos({
        first: 100,
        assetType: 'All',
        groupName: 'StatusVault',
      });

      // Fallback: some devices use different album naming
      if (result.edges.length === 0) {
        result = await CameraRoll.getPhotos({
          first: 100,
          assetType: 'All',
          groupName: 'StatusVault',
        });
      }

      const files: StatusFile[] = result.edges.map((edge, index) => {
        const node = edge.node;
        const isVideo =
          node.type?.startsWith('video') ||
          node.image.uri.includes('.mp4') ||
          node.image.uri.includes('.3gp');
        return {
          id: `saved-${index}-${node.timestamp}`,
          path: node.image.uri,
          name: node.image.filename || `status-${index}`,
          type: isVideo ? 'video' : 'image',
          size: node.image.fileSize || 0,
          lastModified: (node.timestamp || 0) * 1000,
          uri: node.image.uri,
        };
      });

      setSavedStatuses(files);
    } catch (error) {
      console.warn('SavedScreen.loadSaved failed:', error);
      setSavedStatuses([]);
    }
    setLoading(false);
  }, []);

  // Reload every time the tab gains focus (picks up newly saved items)
  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved]),
  );

  const handleItemPress = useCallback(
    (file: StatusFile) => {
      navigation.navigate('Viewer', {file});
    },
    [navigation],
  );

  const handleItemLongPress = useCallback((_file: StatusFile) => {
    // No selection mode for saved screen
  }, []);

  const handleItemSave = useCallback((_file: StatusFile) => {
    // Already saved — no-op
  }, []);

  if (!loading && savedStatuses.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <EmptyState
          icon={<Download size={64} color={theme.textSecondary} />}
          title="No Saved Statuses Yet"
          subtitle="Statuses you save will appear here. Tap a status and press the save button to get started."
        />
        <AdBanner />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <StatusGrid
        statuses={savedStatuses}
        onItemPress={handleItemPress}
        onItemLongPress={handleItemLongPress}
        onItemSave={handleItemSave}
        selectedIds={[]}
        selectionMode={false}
        refreshing={loading}
        onRefresh={loadSaved}
        favoriteIds={[]}
      />
      <AdBanner />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SavedScreen;
