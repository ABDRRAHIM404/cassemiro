import Image from "next/image";
import styles from "./Logo.module.css";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`${styles.root} ${className}`}>
      <Image
        src="/images/brand/client-logo-construcoes-dark-v1.png"
        alt="CASSEMIRO Construções & Reformas"
        width={1604}
        height={980}
        sizes="(max-width: 1000px) 92px, 105px"
        className={styles.image}
      />
    </span>
  );
}
