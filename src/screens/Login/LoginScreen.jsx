import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useDispatch } from 'react-redux';
import {
  useGetOtpOptionDetailsMutation,
  useGetOtpLogNumberMutation,
  useGenerateLoginOtpMutation,
  useValidateLoginOtpMutation,
} from '../../features/auth/authApi';
import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { setUser } from '../../features/auth/authSlice';
import LoginService from '../../services/login/loginService';
import OtpOptionModal from '../../components/OtpOptionModal/OtpOptionModal';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  // API mutations
  const [getOtpOptionDetails, { isLoading: loadingOptions }] =
    useGetOtpOptionDetailsMutation();
  const [getOtpLogNumber, { isLoading: loadingLogNumber }] =
    useGetOtpLogNumberMutation();
  const [generateLoginOtp, { isLoading: generatingOtp }] =
    useGenerateLoginOtpMutation();
  const [validateLoginOtp, { isLoading: validatingOtp }] =
    useValidateLoginOtpMutation();

  // State
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    phoneOtp: '',
    emailOtp: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpOptionModal, setShowOtpOptionModal] = useState(false);
  const [otpConfig, setOtpConfig] = useState(null);
  const [selectedOtpOptions, setSelectedOtpOptions] = useState({
    mobile: false,
    email: false,
  });
  const [otpLogNumber, setOtpLogNumber] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter credentials, 2: Enter OTP

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load OTP configuration when component mounts
    loadOtpConfiguration();

    // Start fade animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadOtpConfiguration = async () => {
    try {
      const payload = LoginService.prepareOtpOptionDetailsPayload();
      const response = await getOtpOptionDetails(payload).unwrap();

      if (response.code === 0 && response.appMsgList.errorStatus === 0) {
        const config = response.content.mst;
        setOtpConfig(config);

        // Check if user can select OTP options
        if (config.userOptnSelFlg === 'Y') {
          setShowOtpOptionModal(true);
        } else {
          // Auto-enable based on flags
          const options = {
            mobile: config.otpMobFlg === 'Y',
            email: config.otpEmailFlg === 'Y',
          };
          setSelectedOtpOptions(options);
        }
      } else {
        Alert.alert('Error', 'Failed to load OTP configuration');
      }
    } catch (error) {
      console.error('Failed to load OTP config:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate phone if mobile OTP is enabled
    if (selectedOtpOptions.mobile) {
      const phoneValidation = LoginService.validatePhoneNumber(formData.phone);
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.message;
      }
    }

    // Validate email if email OTP is enabled
    if (selectedOtpOptions.email && formData.email) {
      const emailValidation = LoginService.validateEmail(formData.email);
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.message;
      }
    }

    // At least one method should be selected
    if (!selectedOtpOptions.mobile && !selectedOtpOptions.email) {
      newErrors.general = 'Please select at least one OTP method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOtpOptionConfirm = options => {
    setSelectedOtpOptions(options);
  };

  const handleSendOtp = async () => {
    if (!validateForm()) return;

    try {
      // Step 1: Get OTP log number
      const logNumberPayload = LoginService.prepareOtpLogNumberPayload({
        email: formData.email,
        phone: formData.phone,
        otpEmailFlg: selectedOtpOptions.email ? 'Y' : 'N',
        otpMobFlg: selectedOtpOptions.mobile ? 'Y' : 'N',
        userOptnSelFlg: otpConfig?.userOptnSelFlg || 'N',
      });

      const logResponse = await getOtpLogNumber(logNumberPayload).unwrap();

      if (logResponse.code === 0 && logResponse.appMsgList.errorStatus === 0) {
        const logNumber = logResponse.content.mst.optnChngLogNo;
        setOtpLogNumber(logNumber);

        // Step 2: Generate OTP
        const otpPayload = LoginService.prepareGenerateOtpPayload({
          email: formData.email,
          phone: formData.phone,
          logNumber,
        });

        const otpResponse = await generateLoginOtp(otpPayload).unwrap();

        if (
          otpResponse.code === 0 &&
          otpResponse.appMsgList.errorStatus === 0
        ) {
          setIsOtpSent(true);
          setStep(2);

          // Store session data
          await LoginService.storeOtpSessionData(
            formData.phone,
            formData.email,
            logNumber,
            otpConfig,
          );

          Alert.alert(
            'OTP Sent',
            selectedOtpOptions.mobile
              ? 'OTP has been sent to your mobile number'
              : 'OTP has been sent to your email',
          );
        } else {
          Alert.alert('Error', 'Failed to send OTP. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Failed to initiate OTP request.');
      }
    } catch (error) {
      console.error('OTP request error:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    }
  };

  const validateOtpInput = () => {
    const newErrors = {};

    if (selectedOtpOptions.mobile && !formData.phoneOtp) {
      newErrors.phoneOtp = 'Mobile OTP is required';
    } else if (selectedOtpOptions.mobile && formData.phoneOtp) {
      const otpValidation = LoginService.validateOtp(formData.phoneOtp);
      if (!otpValidation.isValid) {
        newErrors.phoneOtp = otpValidation.message;
      }
    }

    if (selectedOtpOptions.email && !formData.emailOtp) {
      newErrors.emailOtp = 'Email OTP is required';
    } else if (selectedOtpOptions.email && formData.emailOtp) {
      const otpValidation = LoginService.validateOtp(formData.emailOtp);
      if (!otpValidation.isValid) {
        newErrors.emailOtp = otpValidation.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateOtpInput()) return;

    try {
      const payload = LoginService.prepareValidateOtpPayload({
        email: formData.email,
        phone: formData.phone,
        emailOtp: formData.emailOtp,
        phoneOtp: formData.phoneOtp,
        logNumber: otpLogNumber,
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
        Alert.alert('Login Failed', errorMsg);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    try {
      const otpPayload = LoginService.prepareGenerateOtpPayload({
        email: formData.email,
        phone: formData.phone,
        logNumber: otpLogNumber,
      });

      const otpResponse = await generateLoginOtp(otpPayload).unwrap();

      if (otpResponse.code === 0 && otpResponse.appMsgList.errorStatus === 0) {
        Alert.alert('OTP Resent', 'New OTP has been sent to you.');
      } else {
        Alert.alert('Error', 'Failed to resend OTP.');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isLoading =
    loadingOptions || loadingLogNumber || generatingOtp || validatingOtp;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>🛍️</Text>
              </View>
              <Text style={styles.brandName}>Survey App</Text>
              <Text style={styles.tagline}>Secure OTP-based login</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>
                  {step === 1 ? 'Enter Credentials' : 'Enter OTP'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {step === 1
                    ? 'Enter your phone number or email to receive OTP'
                    : 'Enter the OTP sent to your registered contact'}
                </Text>
              </View>

              {step === 1 ? (
                <>
                  {/* Phone Input (if mobile OTP enabled) */}
                  {selectedOtpOptions.mobile && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Phone number *</Text>
                      <View
                        style={[
                          styles.inputWrapper,
                          errors.phone && styles.inputError,
                        ]}
                      >
                        <Text style={styles.countryCode}>+91</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter 10-digit number"
                          placeholderTextColor={COLORS.text.secondary}
                          value={LoginService.formatPhoneNumber(formData.phone)}
                          onChangeText={text =>
                            handleInputChange('phone', text.replace(/\D/g, ''))
                          }
                          keyboardType="phone-pad"
                          maxLength={12}
                          editable={!isLoading}
                        />
                      </View>
                      {errors.phone && (
                        <Text style={styles.errorText}>{errors.phone}</Text>
                      )}
                    </View>
                  )}

                  {/* Email Input (if email OTP enabled) */}
                  {selectedOtpOptions.email && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Email address {selectedOtpOptions.mobile ? '' : '*'}
                      </Text>
                      <View
                        style={[
                          styles.inputWrapper,
                          errors.email && styles.inputError,
                        ]}
                      >
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your email"
                          placeholderTextColor={COLORS.text.secondary}
                          value={formData.email}
                          onChangeText={text =>
                            handleInputChange('email', text)
                          }
                          keyboardType="email-address"
                          autoCapitalize="none"
                          editable={!isLoading}
                        />
                      </View>
                      {errors.email && (
                        <Text style={styles.errorText}>{errors.email}</Text>
                      )}
                    </View>
                  )}

                  {/* Change OTP Method Button */}
                  {otpConfig?.userOptnSelFlg === 'Y' && (
                    <TouchableOpacity
                      style={styles.changeMethodButton}
                      onPress={() => setShowOtpOptionModal(true)}
                      disabled={isLoading}
                    >
                      <Text style={styles.changeMethodText}>
                        Change OTP Method
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* General Error */}
                  {errors.general && (
                    <View style={styles.apiError}>
                      <Text style={styles.apiErrorText}>
                        ⚠️ {errors.general}
                      </Text>
                    </View>
                  )}

                  {/* Send OTP Button */}
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      isLoading && styles.buttonDisabled,
                      ((selectedOtpOptions.mobile && !formData.phone) ||
                        (selectedOtpOptions.email && !formData.email)) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleSendOtp}
                    disabled={
                      isLoading ||
                      (selectedOtpOptions.mobile && !formData.phone) ||
                      (selectedOtpOptions.email && !formData.email)
                    }
                  >
                    {isLoading ? (
                      <ActivityIndicator color={COLORS.surface} />
                    ) : (
                      <Text style={styles.submitButtonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* OTP Input Section */}
                  <View style={styles.otpSection}>
                    {/* Mobile OTP Input */}
                    {selectedOtpOptions.mobile && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Mobile OTP *</Text>
                        <View
                          style={[
                            styles.inputWrapper,
                            errors.phoneOtp && styles.inputError,
                          ]}
                        >
                          <TextInput
                            style={styles.input}
                            placeholder="Enter 4-6 digit OTP"
                            placeholderTextColor={COLORS.text.secondary}
                            value={formData.phoneOtp}
                            onChangeText={text =>
                              handleInputChange('phoneOtp', text)
                            }
                            keyboardType="number-pad"
                            maxLength={6}
                            editable={!isLoading}
                          />
                        </View>
                        {errors.phoneOtp && (
                          <Text style={styles.errorText}>
                            {errors.phoneOtp}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Email OTP Input */}
                    {selectedOtpOptions.email && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email OTP *</Text>
                        <View
                          style={[
                            styles.inputWrapper,
                            errors.emailOtp && styles.inputError,
                          ]}
                        >
                          <TextInput
                            style={styles.input}
                            placeholder="Enter 4-6 digit OTP"
                            placeholderTextColor={COLORS.text.secondary}
                            value={formData.emailOtp}
                            onChangeText={text =>
                              handleInputChange('emailOtp', text)
                            }
                            keyboardType="number-pad"
                            maxLength={6}
                            editable={!isLoading}
                          />
                        </View>
                        {errors.emailOtp && (
                          <Text style={styles.errorText}>
                            {errors.emailOtp}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Resend OTP Button */}
                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={handleResendOtp}
                      disabled={isLoading}
                    >
                      <Text style={styles.resendButtonText}>
                        Didn't receive OTP? Resend
                      </Text>
                    </TouchableOpacity>

                    {/* Back Button */}
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => {
                        setStep(1);
                        setIsOtpSent(false);
                      }}
                      disabled={isLoading}
                    >
                      <Text style={styles.backButtonText}>
                        Back to Credentials
                      </Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        isLoading && styles.buttonDisabled,
                        ((selectedOtpOptions.mobile && !formData.phoneOtp) ||
                          (selectedOtpOptions.email && !formData.emailOtp)) &&
                          styles.buttonDisabled,
                      ]}
                      onPress={handleLogin}
                      disabled={
                        isLoading ||
                        (selectedOtpOptions.mobile && !formData.phoneOtp) ||
                        (selectedOtpOptions.email && !formData.emailOtp)
                      }
                    >
                      {isLoading ? (
                        <ActivityIndicator color={COLORS.surface} />
                      ) : (
                        <Text style={styles.submitButtonText}>Login Now</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By continuing, you agree to our{' '}
                <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Option Selection Modal */}
      <OtpOptionModal
        visible={showOtpOptionModal}
        onClose={() => setShowOtpOptionModal(false)}
        onConfirm={handleOtpOptionConfirm}
        otpConfig={otpConfig || {}}
        initialSelection={selectedOtpOptions}
      />
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
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '400',
  },
  formSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    height: 48,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    height: '100%',
    textAlignVertical: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    paddingHorizontal: 16,
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  apiError: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  apiErrorText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
  },
  changeMethodButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
  },
  changeMethodText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
    letterSpacing: 0.25,
  },
  buttonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
  },
  otpSection: {
    marginBottom: 8,
  },
  resendButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
  },
  resendButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
