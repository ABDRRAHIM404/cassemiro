type LogoProps = {
  compact?: boolean;
  className?: string;
};

export function Logo({ compact = false, className = "" }: LogoProps) {
  return (
    <span className={`logo ${className}`} aria-label="CASSEMIRO Construções e Reformas">
      <svg className="logo__mark" viewBox="0 0 48 56" aria-hidden="true">
        <path d="M42 9 24 1 6 11v34l18 10 18-9V34L26 43V31l8-4-8-4v-9l16 7V9Z" fill="currentColor" />
        <path d="m6 11 18 10 18-12L24 1 6 11Z" fill="var(--bronze)" opacity=".9" />
      </svg>
      {!compact && (
        <span className="logo__type">
          <strong>CASSEMIRO</strong>
          <small>CONSTRUÇÕES &amp; REFORMAS</small>
        </span>
      )}
    </span>
  );
}
