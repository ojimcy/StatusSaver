import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import useSettingsStore from '../store/useSettingsStore';
import usePermissions from '../hooks/usePermissions';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize, borderRadius} from '../theme/spacing';
import {isAndroid} from '../utils/platform';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface StepConfig {
  id: string;
  illustration: string;
  title: string;
  description: string;
  buttonText: string;
  skipable: boolean;
}

const STEPS: StepConfig[] = [
  {
    id: 'welcome',
    illustration: '\u{1F4F1}',
    title: 'Welcome to StatusVault',
    description:
      'Save and share WhatsApp statuses before they disappear. Your privacy is our priority - everything stays on your device.',
    buttonText: 'Get Started',
    skipable: false,
  },
  {
    id: 'storage',
    illustration: '\u{1F4C2}',
    title: 'Storage Access',
    description:
      'We need access to your storage to find and save WhatsApp statuses. Your files are only accessed locally and never uploaded anywhere.',
    buttonText: 'Grant Access',
    skipable: false,
  },
  ...(Platform.OS === 'android'
    ? [
        {
          id: 'notification',
          illustration: '\u{1F514}',
          title: 'Deleted Message Recovery',
          description:
            'Optionally enable notification access to capture WhatsApp messages before they are deleted. All data stays on your device.',
          buttonText: 'Enable',
          skipable: true,
        },
      ]
    : []),
  {
    id: 'tip_save',
    illustration: '\u{1F4BE}',
    title: 'Save & Batch Save',
    description:
      'Tap any status to view it, then hit Save. Long-press to select multiple and save them all at once.',
    buttonText: 'Next',
    skipable: true,
  },
  {
    id: 'tip_favorite',
    illustration: '\u2665',
    title: 'Favorite Statuses',
    description:
      'Tap the heart icon on any status to mark it as a favorite. Your favorites are saved and stay available even after statuses expire.',
    buttonText: 'Next',
    skipable: true,
  },
  {
    id: 'ready',
    illustration: '\u{1F389}',
    title: "You're All Set!",
    description:
      'Start browsing statuses from the Images and Videos tabs. Saved items appear in the Saved tab.',
    buttonText: "Let's Go",
    skipable: true,
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({onComplete}) => {
  const {theme} = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const {setOnboardingComplete} = useSettingsStore();
  const {requestStorage, requestSAF, requestNotification} = usePermissions();

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleNext = useCallback(async () => {
    if (isLastStep) {
      setOnboardingComplete();
      onComplete();
      return;
    }
    setCurrentStep(prev => prev + 1);
  }, [isLastStep, setOnboardingComplete, onComplete]);

  const handleAction = useCallback(async () => {
    switch (step.id) {
      case 'welcome':
        handleNext();
        break;

      case 'storage':
        await requestStorage();
        // On Android 11+, also need SAF
        if (isAndroid && Number(Platform.Version) >= 30) {
          await requestSAF();
        }
        handleNext();
        break;

      case 'notification':
        requestNotification();
        // Give user time to enable, then proceed
        setTimeout(() => {
          handleNext();
        }, 1000);
        break;

      default:
        handleNext();
    }
  }, [step, handleNext, requestStorage, requestSAF, requestNotification]);

  const handleSkip = useCallback(() => {
    // Tutorial steps (tip_*) and 'ready' — skip straight to finish
    if (step.id.startsWith('tip_') || step.id === 'ready') {
      setOnboardingComplete();
      onComplete();
      return;
    }
    handleNext();
  }, [step, handleNext, setOnboardingComplete, onComplete]);

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {STEPS.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {backgroundColor: theme.border},
            index === currentStep && {backgroundColor: theme.accent},
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.background}]}>
      <View style={styles.content}>
        {/* Illustration area */}
        <View
          style={[
            styles.illustrationContainer,
            {backgroundColor: theme.surface},
          ]}>
          <Text style={styles.illustration}>{step.illustration}</Text>
        </View>

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, {color: theme.text}]}>{step.title}</Text>
          <Text style={[styles.description, {color: theme.textSecondary}]}>
            {step.description}
          </Text>
        </View>

        {/* Progress dots */}
        {renderDots()}

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.mainButton, {backgroundColor: theme.accent}]}
            onPress={handleAction}
            activeOpacity={0.8}>
            <Text style={styles.mainButtonText}>{step.buttonText}</Text>
          </TouchableOpacity>

          {step.skipable && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.6}>
              <Text style={[styles.skipText, {color: theme.textSecondary}]}>
                {step.id.startsWith('tip_') || step.id === 'ready'
                  ? 'Skip'
                  : 'Skip for now'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  illustrationContainer: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: SCREEN_WIDTH * 0.25,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl + spacing.md,
  },
  illustration: {
    fontSize: 72,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  mainButton: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  skipButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.md,
  },
});

export default OnboardingScreen;
