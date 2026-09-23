import { Alert as RNAlert, Platform } from 'react-native';

interface AlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

// React Native Web's Alert.alert() is a silent no-op, so errors and confirm
// dialogs never reached the user in the web build. Fall back to
// window.alert()/window.confirm() there.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 1) {
        const confirmButton = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
        const ok = window.confirm(message ? `${title}\n\n${message}` : title);
        if (ok) confirmButton.onPress?.();
        return;
      }
      window.alert(message ? `${title}\n\n${message}` : title);
      buttons?.[0]?.onPress?.();
      return;
    }
    RNAlert.alert(title, message, buttons);
  },
};
