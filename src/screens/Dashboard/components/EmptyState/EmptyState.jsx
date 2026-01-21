import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../../constants/colors';
import { emptyStateStyles as styles } from './EmptyState.styles';
import { MaterialIcons } from '@expo/vector-icons';

export const EmptyState = ({ 
  title = 'No Forms Available', 
  message = 'There are no forms assigned to you at the moment.',
  icon = 'assignment',
  actionText = 'Refresh',
  onAction 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name={icon} size={64} color={COLORS.gray[300]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};