import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../../constants/colors';


const { width: screenWidth } = Dimensions.get('window');


const ImageUploadField = ({
  fcId,
  label,
  required = false,
  multiple = false,
  maxImages = 5,
  imageQuality = 0.8,
  compressImageMaxWidth = 1024,
  compressImageMaxHeight = 1024,
  allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
  maxFileSize = 5, // in MB
  onImagesChange,
  initialImages = [],
}) => {
  const [images, setImages] = useState(initialImages || []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const scrollViewRef = useRef(null);

  // Check and request permissions
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs camera permission to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // For Android 13+ (API level 33+)
        if (Platform.Version >= 33) {
          const photosGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          );
          return photosGranted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // For Android < 13
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.error('Storage permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  };

  // Validate image file
  const validateImage = (file) => {
    // Check if file type exists
    if (!file.type) {
      // If type is not provided, try to determine from uri
      const uri = file.uri || '';
      if (uri.endsWith('.jpg') || uri.endsWith('.jpeg')) {
        file.type = 'image/jpeg';
      } else if (uri.endsWith('.png')) {
        file.type = 'image/png';
      } else {
        return {
          valid: false,
          error: 'Could not determine file type',
        };
      }
    }

    // Check file type
    const normalizedTypes = allowedTypes.map(type => type.toLowerCase());
    if (!normalizedTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: `File type not supported. Allowed types: ${allowedTypes.map(t => t.split('/')[1] || t).join(', ')}`,
      };
    }

    // Check file size (convert bytes to MB)
    if (file.fileSize) {
      const fileSizeInMB = file.fileSize / (1024 * 1024);
      if (fileSizeInMB > maxFileSize) {
        return {
          valid: false,
          error: `File size exceeds ${maxFileSize}MB limit`,
        };
      }
    }

    return { valid: true };
  };

  // Handle image selection
  const handleImageSelection = async (source) => {
    try {
      // Check if maximum images reached
      if (images.length >= maxImages && !multiple) {
        Alert.alert('Limit Reached', `Maximum ${maxImages} image(s) allowed`);
        return;
      }

      // Request permissions
      if (source === 'camera') {
        const hasCameraPermission = await requestCameraPermission();
        if (!hasCameraPermission) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos');
          return;
        }
      } else {
        const hasStoragePermission = await requestStoragePermission();
        if (!hasStoragePermission) {
          Alert.alert('Permission Required', 'Storage permission is required to select photos');
          return;
        }
      }

      const options = {
        mediaType: 'photo',
        quality: imageQuality,
        maxWidth: compressImageMaxWidth,
        maxHeight: compressImageMaxHeight,
        includeBase64: false, // Don't include base64 by default to avoid memory issues
        selectionLimit: multiple ? maxImages - images.length : 1,
        saveToPhotos: source === 'camera',
      };

      const result = source === 'camera' 
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (result.didCancel) {
        console.log('User cancelled image picker');
        return;
      }

      if (result.errorCode) {
        console.error('Image picker error:', result.errorMessage);
        handleError(result.errorMessage || 'Failed to get image');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        await processSelectedImages(result.assets);
      } else {
        handleError('No images selected');
      }
    } catch (error) {
      console.error('Image selection error:', error);
      handleError('Failed to select image: ' + error.message);
    }
  };

  // Process selected images
  const processSelectedImages = async (selectedAssets) => {
    const newImages = [];
    const errors = [];

    for (const asset of selectedAssets) {
      try {
        // Validate image
        const validation = validateImage(asset);
        if (!validation.valid) {
          errors.push(validation.error);
          continue;
        }

        // Create image object
        const imageObj = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
          timestamp: new Date().toISOString(),
          uploaded: false,
          uploading: false,
          error: null,
        };

        newImages.push(imageObj);
      } catch (error) {
        console.error('Image processing error:', error);
        errors.push(`Failed to process ${asset.fileName || 'image'}`);
      }
    }

    // Update state with new images
    const updatedImages = multiple ? [...images, ...newImages] : [...newImages];
    const finalImages = updatedImages.slice(0, maxImages);
    setImages(finalImages);

    // Notify parent component
    if (onImagesChange) {
      onImagesChange(fcId, finalImages);
    }

    // Show any validation errors
    if (errors.length > 0) {
      Alert.alert(
        'Validation Errors',
        errors.join('\n'),
        [{ text: 'OK' }]
      );
    }
  };

  // Upload image to server (mock implementation)
  const uploadImage = async (image) => {
    setUploadProgress(prev => ({ ...prev, [image.id]: 0 }));
    
    return new Promise((resolve, reject) => {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[image.id] || 0;
          const newProgress = Math.min(currentProgress + 10, 100);
          
          if (newProgress === 100) {
            clearInterval(interval);
            resolve({
              ...image,
              uploaded: true,
              serverUrl: `https://example.com/uploads/${image.fileName}`,
              uploadedAt: new Date().toISOString(),
            });
          }
          
          return { ...prev, [image.id]: newProgress };
        });
      }, 200);
    });
  };

  // Upload all images
  const uploadAllImages = async () => {
    if (images.length === 0) return;

    setUploading(true);
    const uploadedImages = [];
    const failedImages = [];

    for (const image of images) {
      if (image.uploaded) {
        uploadedImages.push(image);
        continue;
      }

      try {
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, uploading: true, error: null } : img
        ));

        const uploadedImage = await uploadImage(image);
        uploadedImages.push(uploadedImage);

        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...uploadedImage, uploading: false } : img
        ));
      } catch (error) {
        console.error('Upload error:', error);
        failedImages.push(image.fileName);
        
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, uploading: false, error: 'Upload failed' } : img
        ));
      }
    }

    setUploading(false);
    
    if (failedImages.length > 0) {
      Alert.alert(
        'Upload Issues',
        `Failed to upload: ${failedImages.join(', ')}`,
        [{ text: 'OK' }]
      );
    }

    if (uploadedImages.length > 0 && failedImages.length === 0) {
      Alert.alert('Success', 'All images uploaded successfully!');
    }
  };

  // Remove image
  const removeImage = (imageId) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedImages = images.filter(img => img.id !== imageId);
            setImages(updatedImages);
            
            if (onImagesChange) {
              onImagesChange(fcId, updatedImages);
            }
          },
        },
      ]
    );
  };

  // Retry failed upload
  const retryUpload = (image) => {
    setImages(prev => prev.map(img => 
      img.id === image.id ? { ...img, error: null } : img
    ));
  };

  // Handle errors
  const handleError = (errorMessage) => {
    Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
  };

  // Render image item
  const renderImageItem = (image) => {
    const progress = uploadProgress[image.id] || 0;
    const isUploading = image.uploading;
    const hasError = image.error;

    return (
      <View key={image.id} style={styles.imageItem}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: image.uri }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {isUploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}
          
          {hasError && (
            <View style={styles.errorOverlay}>
              <Icon name="error-outline" size={24} color={COLORS.error} />
              <Text style={styles.errorText}>Upload Failed</Text>
            </View>
          )}
          
          {image.uploaded && (
            <View style={styles.successOverlay}>
              <Icon name="check-circle" size={24} color={COLORS.success} />
            </View>
          )}
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeImage(image.id)}
          >
            <Icon name="close" size={16} color={COLORS.text.inverse} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.imageInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {image.fileName}
          </Text>
          {image.fileSize && (
            <Text style={styles.fileSize}>
              {(image.fileSize / (1024 * 1024)).toFixed(2)} MB
            </Text>
          )}
          {hasError && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => retryUpload(image)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.fieldContainer}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>{label}</Text>
          {required && <Text style={styles.requiredStar}>*</Text>}
        </View>
        
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {images.length}/{maxImages}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>
        {multiple 
          ? `Upload up to ${maxImages} images (${maxFileSize}MB max each)`
          : 'Upload a single image'}
      </Text>

      {/* Image Grid */}
      {images.length > 0 && (
        <View style={styles.imagesContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesScrollView}
            contentContainerStyle={styles.imagesContent}
          >
            {images.map(renderImageItem)}
          </ScrollView>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, images.length >= maxImages && styles.disabledButton]}
          onPress={() => handleImageSelection('camera')}
          disabled={images.length >= maxImages && !multiple}
        >
          <Icon name="photo-camera" size={20} color={images.length >= maxImages ? COLORS.text.disabled : COLORS.primary} />
          <Text style={[styles.actionButtonText, images.length >= maxImages && styles.disabledButtonText]}>
            Camera
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, images.length >= maxImages && styles.disabledButton]}
          onPress={() => handleImageSelection('gallery')}
          disabled={images.length >= maxImages && !multiple}
        >
          <Icon name="photo-library" size={20} color={images.length >= maxImages ? COLORS.text.disabled : COLORS.primary} />
          <Text style={[styles.actionButtonText, images.length >= maxImages && styles.disabledButtonText]}>
            Gallery
          </Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton]}
            onPress={uploadAllImages}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={COLORS.text.inverse} />
            ) : (
              <>
                <Icon name="cloud-upload" size={20} color={COLORS.text.inverse} />
                <Text style={[styles.actionButtonText, styles.uploadButtonText]}>
                  Upload
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Validation Messages */}
      {images.length === 0 && required && (
        <Text style={styles.validationText}>
          * This field is required
        </Text>
      )}

      {images.length >= maxImages && (
        <Text style={styles.limitText}>
          Maximum image limit reached ({maxImages})
        </Text>
      )}

      {/* Allowed Types */}
      <View style={styles.allowedTypesContainer}>
        <Text style={styles.allowedTypesLabel}>Allowed types:</Text>
        <View style={styles.allowedTypesList}>
          {allowedTypes.map((type, index) => (
            <View key={index} style={styles.typeTag}>
              <Text style={styles.typeText}>
                {type.split('/')[1] || type.replace('image/', '')}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    fontFamily: 'System',
  },
  requiredStar: {
    color: COLORS.error,
    marginLeft: 4,
    fontSize: 16,
    fontFamily: 'System',
  },
  countContainer: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    fontFamily: 'System',
  },
  description: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
    fontFamily: 'System',
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imagesScrollView: {
    marginHorizontal: -16,
  },
  imagesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  imageItem: {
    width: 120,
    marginRight: 12,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.gray[100],
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: COLORS.text.inverse,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'System',
    fontWeight: '600',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'System',
    fontWeight: '500',
  },
  successOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageInfo: {
    marginTop: 8,
  },
  fileName: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontFamily: 'System',
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontFamily: 'System',
    marginTop: 2,
  },
  retryButton: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: COLORS.errorLight,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    fontSize: 11,
    color: COLORS.error,
    fontFamily: 'System',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabledButton: {
    backgroundColor: COLORS.gray[200],
    borderColor: COLORS.gray[300],
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: 'System',
  },
  disabledButtonText: {
    color: COLORS.text.disabled,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  uploadButtonText: {
    color: COLORS.text.inverse,
  },
  validationText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 8,
    fontFamily: 'System',
  },
  limitText: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 8,
    fontFamily: 'System',
    fontWeight: '500',
  },
  allowedTypesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  allowedTypesLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 8,
    fontFamily: 'System',
  },
  allowedTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeTag: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontFamily: 'System',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});


export default ImageUploadField;