import React from 'react';
import {
  Cpu,
  Orbit,
  Trees,
  HeartPulse,
  Atom,
  Landmark,
  GraduationCap,
  TrendingUp,
  Globe,
  Compass,
  Activity,
  Utensils,
  Palette,
  Gamepad2,
  Leaf,
  Brain,
  Wrench,
  Sparkles,
  Users,
  Newspaper,
  Film,
  Code,
  Music,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Cpu,
  Orbit,
  Trees,
  HeartPulse,
  Atom,
  Landmark,
  GraduationCap,
  TrendingUp,
  Globe,
  Compass,
  Activity,
  Utensils,
  Palette,
  Gamepad2,
  Leaf,
  Brain,
  Wrench,
  Sparkles,
  Users,
  Newspaper,
  Film,
  Code,
  Music,
};

interface CategoryIconProps {
  name?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-4 h-4' }) => {
  const IconComponent = (name && ICON_MAP[name]) || Compass;
  return <IconComponent className={className} />;
};
