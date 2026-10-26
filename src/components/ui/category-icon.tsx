import {
  Activity, Bike, BatteryCharging, Cable, Camera, Cctv, CookingPot, Gamepad2, Headphones, HardDrive, Keyboard, Laptop,
  Lightbulb, Magnet, Monitor, Mouse, Plane, PlugZap, Printer, Refrigerator, Shield, Smartphone, Speaker, Tablet, Tv,
  Coffee, WashingMachine, Watch, Wind, type LucideProps,
} from "lucide-react";

const icons = {
  phone: Smartphone,
  tablet: Tablet,
  watch: Watch,
  band: Activity,
  audio: Headphones,
  earbuds: Headphones,
  headphones: Headphones,
  speaker: Speaker,
  soundbar: Speaker,
  laptop: Laptop,
  accessory: Cable,
  charger: PlugZap,
  cable: Cable,
  case: Shield,
  powerbank: BatteryCharging,
  holder: Magnet,
  tv: Tv,
  monitor: Monitor,
  scooter: Bike,
  ebike: Bike,
  home: WashingMachine,
  vacuum: Wind,
  appliance: WashingMachine,
  fridge: Refrigerator,
  coffee: Coffee,
  airfryer: CookingPot,
  console: Gamepad2,
  gamepad: Gamepad2,
  camera: Camera,
  drone: Plane,
  keyboard: Keyboard,
  mouse: Mouse,
  ssd: HardDrive,
  printer: Printer,
  bulb: Lightbulb,
  ipcam: Cctv,
} as const;

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? Smartphone;
  return <Icon {...props} />;
}
