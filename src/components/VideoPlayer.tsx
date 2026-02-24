import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Video, {OnLoadData, OnProgressData} from 'react-native-video';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize} from '../theme/spacing';

interface VideoPlayerProps {
  uri: string;
  paused: boolean;
  onTogglePlay: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  paused,
  onTogglePlay,
}) => {
  const {theme} = useTheme();
  const videoRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const onLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
    setLoading(false);
  }, []);

  const onProgress = useCallback((data: OnProgressData) => {
    setProgress(data.currentTime);
  }, []);

  const onEnd = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.seek(0);
    }
    onTogglePlay();
  }, [onTogglePlay]);

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{uri}}
        style={styles.video}
        resizeMode="contain"
        paused={paused}
        onLoad={onLoad}
        onProgress={onProgress}
        onEnd={onEnd}
        onBuffer={() => setLoading(true)}
        onReadyForDisplay={() => setLoading(false)}
        repeat={false}
      />

      <TouchableOpacity
        style={styles.controlsOverlay}
        activeOpacity={1}
        onPress={toggleControls}>
        {loading && (
          <ActivityIndicator size="large" color="#FFFFFF" />
        )}

        {showControls && !loading && (
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={onTogglePlay}>
            <Text style={styles.playPauseText}>
              {paused ? '\u25B6' : '\u2759\u2759'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {showControls && (
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(progress)}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    flex: 1,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
});

export default VideoPlayer;
