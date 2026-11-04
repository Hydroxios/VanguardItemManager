interface LoaderProps {
  size?: number;
  /** Read by screen readers; without it the loader is decorative (the surrounding text already says what loads) */
  label?: string;
  className?: string;
}

/**
 * Destiny-style loader: a light sweeps around the outline of a diamond while its core turns and pulses.
 * Only transform and opacity are animated so the browser's compositor keeps it moving while the main
 * thread is blocked parsing the manifest.
 */
const Loader = ({ size = 40, label, className = "" }: LoaderProps) => (
  <span
    className={`loader ${className}`}
    style={{ width: size, height: size }}
    {...(label ? { role: "status", "aria-label": label } : { "aria-hidden": true })}
  >
    <span className="loader-ring">
      <span className="loader-sweep" />
    </span>
    <span className="loader-core" />
  </span>
);

export default Loader;
