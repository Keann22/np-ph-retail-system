import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 3h12l4 6-10 12L2 9l4-6Z" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))"/>
      <path d="m2 9 10 12" stroke="hsl(var(--primary))"/>
      <path d="m12 21 10-12" stroke="hsl(var(--primary))"/>
      <path d="M12 3v18" stroke="hsl(var(--accent))" strokeWidth="3"/>
    </svg>
  );
}
