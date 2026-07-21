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
import { BRAND_COLOURS } from '@/constants/brandAssets'
import { CATEGORY_COLOURS } from '@/constants/categories'

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
    paddingHorizontal: 32,
  },
  sheet: {
    backgroundColor: BRAND_COLOURS.cream,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#000000',
    padding: 24,
    width: '100%',
    maxWidth: 420,
    gap: 14,
  },
  title: {
    fontFamily: 'BalooChettan2_700Bold',
    fontSize: 22,
    color: BRAND_COLOURS.ink,
    lineHeight: 30,
  },
  message: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: BRAND_COLOURS.hint,
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#000000',
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: '#FFFFFF',
  },
  btnCancelText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: BRAND_COLOURS.ink,
  },
  btnConfirm: {
    backgroundColor: BRAND_COLOURS.orange,
  },
  btnDestructive: {
    backgroundColor: CATEGORY_COLOURS.Random,
  },
  btnConfirmText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
})
