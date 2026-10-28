// Per-icon imports: Metro does not tree-shake, so importing from the package root
// would bundle all ~1,900 icons
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import Bell from "lucide-react-native/icons/bell";
import Calendar from "lucide-react-native/icons/calendar";
import Check from "lucide-react-native/icons/check";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ChevronUp from "lucide-react-native/icons/chevron-up";
import Circle from "lucide-react-native/icons/circle";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import CircleX from "lucide-react-native/icons/circle-x";
import Clock from "lucide-react-native/icons/clock";
import Dumbbell from "lucide-react-native/icons/dumbbell";
import Ellipsis from "lucide-react-native/icons/ellipsis";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import Flame from "lucide-react-native/icons/flame";
import House from "lucide-react-native/icons/house";
import Info from "lucide-react-native/icons/info";
import LogOut from "lucide-react-native/icons/log-out";
import Minus from "lucide-react-native/icons/minus";
import Pencil from "lucide-react-native/icons/pencil";
import Moon from "lucide-react-native/icons/moon";
import Plus from "lucide-react-native/icons/plus";
import Ruler from "lucide-react-native/icons/ruler";
import Scale from "lucide-react-native/icons/scale";
import Search from "lucide-react-native/icons/search";
import Settings from "lucide-react-native/icons/settings";
import Sun from "lucide-react-native/icons/sun";
import Target from "lucide-react-native/icons/target";
import Trash from "lucide-react-native/icons/trash";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import User from "lucide-react-native/icons/user";
import Video from "lucide-react-native/icons/video";
import X from "lucide-react-native/icons/x";
import type { LucideIcon } from "lucide-react-native";

// Curated set of icons: logical name -> Lucide component
export const IconMap = {
  arrowLeft: ArrowLeft,
  bell: Bell,
  calendar: Calendar,
  check: Check,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  circle: Circle,
  circleAlert: CircleAlert,
  circleCheck: CircleCheck,
  circleX: CircleX,
  clock: Clock,
  dark: Moon,
  dumbbell: Dumbbell,
  ellipsis: Ellipsis,
  eye: Eye,
  eyeClosed: EyeOff,
  flame: Flame,
  height: Ruler,
  home: House,
  info: Info,
  light: Sun,
  minus: Minus,
  pencil: Pencil,
  plus: Plus,
  search: Search,
  settings: Settings,
  signOut: LogOut,
  target: Target,
  trash: Trash,
  triangleAlert: TriangleAlert,
  user: User,
  video: Video,
  weight: Scale,
  x: X,
} satisfies Record<string, LucideIcon>;
