import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';
import { useColors } from '../../lib/theme';

/**
 * Semantic icon names used across the app. Keeping a central map (rather than
 * referencing Ionicons glyphs directly at call sites) means the whole icon set
 * can be re-themed or swapped to another family in one place.
 */
export type IconName =
  | 'search'
  | 'car'
  | 'carFilled'
  | 'ticket'
  | 'chat'
  | 'person'
  | 'calendar'
  | 'seats'
  | 'bell'
  | 'location'
  | 'filter'
  | 'settings'
  | 'star'
  | 'phone'
  | 'trash'
  | 'warning'
  | 'arrowForward'
  | 'arrowUp'
  | 'arrowDown'
  | 'swap'
  | 'city'
  | 'intercity'
  | 'flag'
  | 'sunny'
  | 'moon'
  | 'systemTheme'
  | 'list'
  | 'trophy'
  | 'plate'
  | 'blocked'
  | 'document'
  | 'lock'
  | 'plus'
  | 'ruler'
  | 'close'
  | 'people'
  | 'checkmark'
  | 'thumbsUp'
  | 'thumbsDown';

const GLYPHS: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  search: 'search-outline',
  car: 'car-outline',
  carFilled: 'car-sport',
  ticket: 'ticket-outline',
  chat: 'chatbubble-outline',
  person: 'person-outline',
  calendar: 'calendar-outline',
  seats: 'people-outline',
  bell: 'notifications-outline',
  location: 'location-outline',
  filter: 'options-outline',
  settings: 'settings-outline',
  star: 'star',
  phone: 'call-outline',
  trash: 'trash-outline',
  warning: 'alert-circle-outline',
  arrowForward: 'arrow-forward',
  arrowUp: 'arrow-up',
  arrowDown: 'arrow-down',
  swap: 'swap-vertical',
  city: 'business-outline',
  intercity: 'trail-sign-outline',
  flag: 'flag-outline',
  sunny: 'sunny-outline',
  moon: 'moon-outline',
  systemTheme: 'phone-portrait-outline',
  list: 'clipboard-outline',
  trophy: 'trophy-outline',
  plate: 'card-outline',
  blocked: 'ban-outline',
  document: 'document-text-outline',
  lock: 'lock-closed-outline',
  plus: 'add',
  ruler: 'resize-outline',
  close: 'close',
  people: 'people-outline',
  checkmark: 'checkmark-circle',
  thumbsUp: 'thumbs-up-outline',
  thumbsDown: 'thumbs-down-outline',
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export default function Icon({ name, size = 18, color, style }: Props) {
  const colors = useColors();
  return <Ionicons name={GLYPHS[name]} size={size} color={color ?? colors.text} style={style} />;
}
