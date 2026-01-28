import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { initializeAuth } from '../features/auth/authSlice';
import { COLORS } from '../constants/colors';

const RootNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading } = useSelector(state => state.auth);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      await dispatch(initializeAuth());
      setAppReady(true);
    };

    initAuth();
  }, [dispatch]);

  if (isLoading || !appReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <MainNavigator /> 
      }
    </NavigationContainer>
  );
};

export default RootNavigator;
