import React, {useEffect, useState} from 'react';
import {StatusBar, StyleSheet, AppState, View, Text} from 'react-native';
import type {AppStateStatus} from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AdManager from './src/services/AdService';

import HomeScreen from './src/screens/HomeScreen';
import VideosScreen from './src/screens/VideosScreen';
import SavedScreen from './src/screens/SavedScreen';
import ViewerScreen from './src/screens/ViewerScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import MessageDetailScreen from './src/screens/MessageDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

import VariantSelector from './src/components/VariantSelector';
import useSettingsStore from './src/store/useSettingsStore';
import useTheme from './src/hooks/useTheme';
import useMessageCapture from './src/hooks/useMessageCapture';
import {fontSize, spacing} from './src/theme/spacing';
import {supportsDeletedMessages} from './src/utils/platform';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// --- Stack navigators for each tab ---

function ImagesStack() {
  const {theme} = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.headerBackground},
        headerTintColor: theme.headerText,
        headerTitleStyle: {fontWeight: '600', fontSize: fontSize.xl},
      }}>
      <Stack.Screen
        name="ImagesHome"
        component={HomeScreen}
        options={{
          title: 'StatusVault',
          headerRight: () => <VariantSelector />,
        }}
      />
      <Stack.Screen
        name="Viewer"
        component={ViewerScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}

function VideosStack() {
  const {theme} = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.headerBackground},
        headerTintColor: theme.headerText,
        headerTitleStyle: {fontWeight: '600', fontSize: fontSize.xl},
      }}>
      <Stack.Screen
        name="VideosHome"
        component={VideosScreen}
        options={{
          title: 'Videos',
          headerRight: () => <VariantSelector />,
        }}
      />
      <Stack.Screen
        name="Viewer"
        component={ViewerScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}

function SavedStack() {
  const {theme} = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.headerBackground},
        headerTintColor: theme.headerText,
        headerTitleStyle: {fontWeight: '600', fontSize: fontSize.xl},
      }}>
      <Stack.Screen
        name="SavedHome"
        component={SavedScreen}
        options={{title: 'Saved'}}
      />
      <Stack.Screen
        name="Viewer"
        component={ViewerScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}

function MessagesStack() {
  const {theme} = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.headerBackground},
        headerTintColor: theme.headerText,
        headerTitleStyle: {fontWeight: '600', fontSize: fontSize.xl},
      }}>
      <Stack.Screen
        name="MessagesHome"
        component={MessagesScreen}
        options={{
          title: 'Messages',
          headerRight: () => <VariantSelector />,
        }}
      />
      <Stack.Screen
        name="MessageDetail"
        component={MessageDetailScreen}
        options={({route}: any) => ({
          title: route.params?.contactName || 'Messages',
        })}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const {theme} = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.headerBackground},
        headerTintColor: theme.headerText,
        headerTitleStyle: {fontWeight: '600', fontSize: fontSize.xl},
      }}>
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
    </Stack.Navigator>
  );
}

// --- Tab label component (used instead of icons) ---

interface TabLabelProps {
  label: string;
  focused: boolean;
  color: string;
}

function TabLabel({label, focused, color}: TabLabelProps) {
  return (
    <Text style={[styles.tabLabel, {color}, focused && styles.tabLabelFocused]}>
      {label}
    </Text>
  );
}

// --- Main tab navigator ---

function MainTabs() {
  const {theme} = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: spacing.xs,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: fontSize.sm,
          fontWeight: '500',
        },
      }}>
      <Tab.Screen
        name="Images"
        component={ImagesStack}
        options={{
          tabBarLabel: ({focused, color}) => (
            <TabLabel label="Images" focused={focused} color={color} />
          ),
          tabBarIcon: ({focused, color}) => (
            <View
              style={[
                styles.tabIconContainer,
                {borderColor: color},
                focused && {backgroundColor: color},
              ]}>
              <Text
                style={[
                  styles.tabIconText,
                  {color: focused ? '#FFFFFF' : color},
                ]}>
                I
              </Text>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Videos"
        component={VideosStack}
        options={{
          tabBarLabel: ({focused, color}) => (
            <TabLabel label="Videos" focused={focused} color={color} />
          ),
          tabBarIcon: ({focused, color}) => (
            <View
              style={[
                styles.tabIconContainer,
                {borderColor: color},
                focused && {backgroundColor: color},
              ]}>
              <Text
                style={[
                  styles.tabIconText,
                  {color: focused ? '#FFFFFF' : color},
                ]}>
                V
              </Text>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Saved"
        component={SavedStack}
        options={{
          tabBarLabel: ({focused, color}) => (
            <TabLabel label="Saved" focused={focused} color={color} />
          ),
          tabBarIcon: ({focused, color}) => (
            <View
              style={[
                styles.tabIconContainer,
                {borderColor: color},
                focused && {backgroundColor: color},
              ]}>
              <Text
                style={[
                  styles.tabIconText,
                  {color: focused ? '#FFFFFF' : color},
                ]}>
                S
              </Text>
            </View>
          ),
        }}
      />

      {supportsDeletedMessages && (
        <Tab.Screen
          name="Messages"
          component={MessagesStack}
          options={{
            tabBarLabel: ({focused, color}) => (
              <TabLabel label="Messages" focused={focused} color={color} />
            ),
            tabBarIcon: ({focused, color}) => (
              <View
                style={[
                  styles.tabIconContainer,
                  {borderColor: color},
                  focused && {backgroundColor: color},
                ]}>
                <Text
                  style={[
                    styles.tabIconText,
                    {color: focused ? '#FFFFFF' : color},
                  ]}>
                  M
                </Text>
              </View>
            ),
          }}
        />
      )}

      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: ({focused, color}) => (
            <TabLabel label="Settings" focused={focused} color={color} />
          ),
          tabBarIcon: ({focused, color}) => (
            <View
              style={[
                styles.tabIconContainer,
                {borderColor: color},
                focused && {backgroundColor: color},
              ]}>
              <Text
                style={[
                  styles.tabIconText,
                  {color: focused ? '#FFFFFF' : color},
                ]}>
                {'\u2699'}
              </Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// --- App root ---

function App(): React.JSX.Element {
  const {onboardingComplete} = useSettingsStore();
  const {theme, isDark} = useTheme();
  const [adsInitialized, setAdsInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(!onboardingComplete);

  // Start capturing WhatsApp notification messages in the background
  useMessageCapture();

  // Build React Navigation theme based on our custom colors
  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: theme.primary,
          background: theme.background,
          card: theme.card,
          text: theme.text,
          border: theme.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: theme.primary,
          background: theme.background,
          card: theme.card,
          text: theme.text,
          border: theme.border,
        },
      };

  useEffect(() => {
    // Initialize AdMob + preload all ad formats via AdManager
    AdManager.getInstance()
      .initialize()
      .then(() => setAdsInitialized(true))
      .catch((err: Error) => console.warn('AdMob init failed:', err));
  }, []);

  // App Open ad: track foreground/background transitions
  useEffect(() => {
    if (showOnboarding) {
      return;
    }

    const adManager = AdManager.getInstance();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        adManager.onBackground();
      } else if (nextAppState === 'active') {
        adManager.showAppOpen();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [showOnboarding]);

  // Update showOnboarding when store changes
  useEffect(() => {
    if (onboardingComplete) {
      setShowOnboarding(false);
    }
  }, [onboardingComplete]);

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.background}
        />
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.statusBar}
      />
      <NavigationContainer theme={navigationTheme}>
        <MainTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  tabLabelFocused: {
    fontWeight: '700',
  },
  tabIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default App;
