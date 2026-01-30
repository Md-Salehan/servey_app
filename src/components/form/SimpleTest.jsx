import React from 'react';
import {
  View,
  Button,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';

async function requestCameraPermission() {
  if (Platform.OS !== 'android') return true;

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Camera Permission',
      message: 'This app needs access to your camera',
      buttonPositive: 'OK',
      buttonNegative: 'Cancel',
    },
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export default function SimpleTest() {
  console.log('Hermes enabled:', !!global.HermesInternal);

  const openCamera = async () => {
    console.log('ImagePicker module:', ImagePicker);

    // 🔐 REQUEST PERMISSION FIRST
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      Alert.alert('Permission denied', 'Camera permission is required');
      return;
    }

    try {
      const result = await ImagePicker.launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.8,
        saveToPhotos: true,
      });

      if (result.didCancel) {
        console.log('User cancelled camera');
        return;
      }

      if (result.errorCode) {
        console.log('Picker error:', result.errorMessage);
        Alert.alert('Error', result.errorMessage || 'Camera failed');
        return;
      }

      const image = result.assets?.[0];
      console.log('Captured image:', image);
    } catch (err) {
      console.log('Unexpected error:', err);
      Alert.alert('Error', 'Unexpected camera error');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Button title="Open Camera" onPress={openCamera} />
    </View>
  );
}
