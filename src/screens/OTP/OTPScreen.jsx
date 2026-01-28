import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { useValidateLoginOtpMutation } from '../../features/auth/authApi';
import { useDispatch } from 'react-redux';
import { setUser } from '../../features/auth/authSlice';
import LoginService from '../../services/login/loginService';

const OTPScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { phone, email, logNumber, otpOptions } = route.params || {};

  const [validateLoginOtp, { isLoading }] = useValidateLoginOtpMutation();

  const [otpData, setOtpData] = useState({
    phoneOtp: '',
    emailOtp: '',
  });

  const [errors, setErrors] = useState({});
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Start countdown timer
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const validateOtp = () => {
    const newErrors = {};

    if (otpOptions?.mobile && !otpData.phoneOtp) {
      newErrors.phoneOtp = 'Mobile OTP is required';
    } else if (otpOptions?.mobile && otpData.phoneOtp) {
      const validation = LoginService.validateOtp(otpData.phoneOtp);
      if (!validation.isValid) {
        newErrors.phoneOtp = validation.message;
      }
    }

    if (otpOptions?.email && !otpData.emailOtp) {
      newErrors.emailOtp = 'Email OTP is required';
    } else if (otpOptions?.email && otpData.emailOtp) {
      const validation = LoginService.validateOtp(otpData.emailOtp);
      if (!validation.isValid) {
        newErrors.emailOtp = validation.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerifyOtp = async () => {
    if (!validateOtp()) return;

    try {
      const payload = LoginService.prepareValidateOtpPayload({
        email,
        phone,
        emailOtp: otpData.emailOtp,
        phoneOtp: otpData.phoneOtp,
        logNumber,
      });

      const response = await validateLoginOtp(payload).unwrap();

      if (response.code === 0 && response.appMsgList.errorStatus === 0) {
        // Success - user is now authenticated
        const userData = response.content.mst;
        dispatch(setUser(userData));

        // Clear OTP session
        await LoginService.clearOtpSessionData();

        // Navigate to dashboard
        navigation.navigate(ROUTES.DASHBOARD);
      } else {
        const errorMsg =
          response.appMsgList?.msgDesc || 'Invalid OTP. Please try again.';
        Alert.alert('Verification Failed', errorMsg);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handleResendOtp = () => {
    if (!canResend) return;

    // This would typically call an API to resend OTP
    Alert.alert('OTP Resent', 'A new OTP has been sent to you.');
    setTimer(60);
    setCanResend(false);

    // Restart timer
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (field, value) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtpData(prev => ({ ...prev, [field]: numericValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatContactInfo = () => {
    if (otpOptions?.mobile && otpOptions?.email) {
      return `to ${phone?.slice(-4)} and ${email}`;
    } else if (otpOptions?.mobile) {
      return `to ${phone?.slice(-4)}`;
    } else if (otpOptions?.email) {
      return `to ${email}`;
    }
    return '';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🔐</Text>
              </View>
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.subtitle}>
                Enter the OTP sent {formatContactInfo()}
              </Text>
            </View>

            {/* OTP Inputs */}
            <View style={styles.otpContainer}>
              {/* Mobile OTP Input */}
              {otpOptions?.mobile && (
                <View style={styles.otpInputGroup}>
                  <Text style={styles.otpLabel}>Mobile OTP</Text>
                  <View style={styles.otpInputWrapper}>
                    <TextInput
                      style={[
                        styles.otpInput,
                        errors.phoneOtp && styles.inputError,
                      ]}
                      placeholder="Enter 4-6 digits"
                      placeholderTextColor={COLORS.text.secondary}
                      value={otpData.phoneOtp}
                      onChangeText={value => handleOtpChange('phoneOtp', value)}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isLoading}
                    />
                  </View>
                  {errors.phoneOtp && (
                    <Text style={styles.errorText}>{errors.phoneOtp}</Text>
                  )}
                </View>
              )}

              {/* Email OTP Input */}
              {otpOptions?.email && (
                <View style={styles.otpInputGroup}>
                  <Text style={styles.otpLabel}>Email OTP</Text>
                  <View style={styles.otpInputWrapper}>
                    <TextInput
                      style={[
                        styles.otpInput,
                        errors.emailOtp && styles.inputError,
                      ]}
                      placeholder="Enter 4-6 digits"
                      placeholderTextColor={COLORS.text.secondary}
                      value={otpData.emailOtp}
                      onChangeText={value => handleOtpChange('emailOtp', value)}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isLoading}
                    />
                  </View>
                  {errors.emailOtp && (
                    <Text style={styles.errorText}>{errors.emailOtp}</Text>
                  )}
                </View>
              )}

              {/* Timer */}
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                  {canResend ? 'Ready to resend' : `Resend OTP in ${timer}s`}
                </Text>
              </View>

              {/* Resend Button */}
              <TouchableOpacity
                style={[
                  styles.resendButton,
                  (!canResend || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleResendOtp}
                disabled={!canResend || isLoading}
              >
                <Text style={styles.resendButtonText}>Resend OTP</Text>
              </TouchableOpacity>

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  isLoading && styles.buttonDisabled,
                  ((otpOptions?.mobile && !otpData.phoneOtp) ||
                    (otpOptions?.email && !otpData.emailOtp)) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={
                  isLoading ||
                  (otpOptions?.mobile && !otpData.phoneOtp) ||
                  (otpOptions?.email && !otpData.emailOtp)
                }
              >
                <Text style={styles.verifyButtonText}>
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </Text>
              </TouchableOpacity>

              {/* Back Link */}
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.goBack()}
                disabled={isLoading}
              >
                <Text style={styles.backLinkText}>← Back to login</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  otpContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  otpInputGroup: {
    marginBottom: 24,
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  otpInputWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  otpInput: {
    fontSize: 18,
    color: COLORS.text.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'center',
    letterSpacing: 4,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  resendButton: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primaryDark,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
});

export default OTPScreen;
