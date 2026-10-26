import { Cable, Headphones, Laptop, Smartphone, Tablet, Watch, type LucideProps } from "lucide-react";

const icons = {
  phone: Smartphone,
  tablet: Tablet,
  watch: Watch,
  audio: Headphones,
  laptop: Laptop,
  accessory: Cable,
} as const;

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? Smartphone;
  return <Icon {...props} />;
}
