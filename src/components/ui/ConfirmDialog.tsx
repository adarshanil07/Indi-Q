// =============================================================================
// components/ui/ConfirmDialog.tsx
// Centred confirmation widget with Cancel / Confirm actions.
//
// Replaces React Native's Alert.alert for destructive confirmations —
// Alert with buttons is a silent no-op on web, so Undo/End/Restart appeared
// to "not work" when testing in the browser. This renders identically on
// iOS, Android, and web.
// =============================================================================

import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { BORDER_RADIUS, COLOURS, FONT_SIZE, SPACING } from '@/constants/theme'

interface Props {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  /** Destructive styling (red confirm button). Defaults to true. */
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = true,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onCancel}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, destructive ? styles.btnDestructive : styles.btnConfirm]}
              onPress={onConfirm}
            >
              <Text style={styles.btnConfirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  sheet: {
    backgroundColor: COLOURS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 420,
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLOURS.textPrimary,
  },
  message: {
    fontSize: FONT_SIZE.md,
    color: COLOURS.textSecondary,
    lineHeight: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: COLOURS.surface,
  },
  btnCancelText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLOURS.textPrimary,
  },
  btnConfirm: {
    backgroundColor: COLOURS.textPrimary,
  },
  btnDestructive: {
    backgroundColor: COLOURS.danger,
  },
  btnConfirmText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
