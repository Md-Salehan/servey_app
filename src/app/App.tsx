import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Text } from 'react-native';
import { store } from './store';
import RootNavigator from '../navigation/RootNavigator';

const App = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <RootNavigator />
        {/* <Text>Survey App</Text> */}
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;