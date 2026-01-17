import React, { useState } from 'react';
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
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from '../../features/auth/authApi';
import { setUser } from '../../features/auth/authSlice';
import { styles } from './Login.styles';
import { ROUTES } from '../../constants/routes';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [login, { isLoading,  }] = useLoginMutation();

  const [formData, setFormData] = useState({
    username: 'emilys',
    password: 'emilyspass',
    expiresInMins: 30,
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
        console.log(formData);
        
      const response = await login(formData).unwrap();
      console.log(response);
      dispatch(setUser(response));
      Alert.alert('Success', 'Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Failed',
        error?.data?.message || 'Invalid credentials. Please try again.x'
      );
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            
            <TextInput
              style={[styles.input, errors.username && { borderColor: '#ff4d4f' }]}
              placeholder="Username"
              value={formData.username}
              onChangeText={(text) => handleInputChange('username', text)}
              autoCapitalize="none"
              editable={!isLoading}
            />
            {errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}

            <TextInput
              style={[styles.input, errors.password && { borderColor: '#ff4d4f' }]}
              placeholder="Password"
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              secureTextEntry
              editable={!isLoading}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.link}
              onPress={() => navigation.navigate(ROUTES.REGISTER)}
              disabled={isLoading}
            >
              <Text style={styles.linkText}>
                Don't have an account? Register
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;