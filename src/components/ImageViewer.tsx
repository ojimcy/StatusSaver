import React, {useCallback, useRef} from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';

interface ImageViewerProps {
  uri: string;
}

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const DOUBLE_TAP_DELAY = 300;
const ZOOM_SCALE = 2.5;

const ImageViewer: React.FC<ImageViewerProps> = ({uri}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);
  const isZoomedRef = useRef(false);

  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap — toggle zoom
      if (isZoomedRef.current) {
        scrollViewRef.current?.scrollResponderZoomTo({
          x: 0,
          y: 0,
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          animated: true,
        });
        isZoomedRef.current = false;
      } else {
        const zoomWidth = SCREEN_WIDTH / ZOOM_SCALE;
        const zoomHeight = SCREEN_HEIGHT / ZOOM_SCALE;
        scrollViewRef.current?.scrollResponderZoomTo({
          x: (SCREEN_WIDTH - zoomWidth) / 2,
          y: (SCREEN_HEIGHT - zoomHeight) / 2,
          width: zoomWidth,
          height: zoomHeight,
          animated: true,
        });
        isZoomedRef.current = true;
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom={true}
        centerContent={true}>
        <TouchableWithoutFeedback onPress={handlePress}>
          <Image
            source={{uri}}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});

export default ImageViewer;
