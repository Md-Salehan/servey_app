import { StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../constants/colors';

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    fontFamily: 'System',
    minHeight: 48,
  },
  disabledInput: {
    backgroundColor: COLORS.gray[100],
    color: COLORS.text.disabled,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  counterText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'right',
    marginTop: 4,
    fontFamily: 'System',
  },
  datePickerButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontFamily: 'System',
  },
  datePickerPlaceholder: {
    color: COLORS.text.disabled,
  },
  dateTimePicker: {
    backgroundColor: COLORS.surface,
  },
  // NEW: Common styles for checkbox
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
    fontFamily: 'System',
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 4,
    fontFamily: 'System',
    lineHeight: 18,
  },
});

export default styles;