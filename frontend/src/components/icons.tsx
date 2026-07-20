import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

function IconBase({ size, ...props }: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="icon" 
      aria-hidden="true" 
      {...props} 
    />
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </IconBase>
  );
}

export const Icons = {
  menu: MenuIcon,
};
