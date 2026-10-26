/** Re-mounts on every navigation: a short fade makes page changes feel like screen transitions. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="[animation:fade-in_0.22s_ease-out]">{children}</div>;
}
