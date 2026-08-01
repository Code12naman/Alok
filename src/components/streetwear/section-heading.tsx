import { motion } from "framer-motion";

type SectionHeadingProps = {
  label: string;
  title: string;
  description: string;
  align?: "left" | "center";
};

export function SectionHeading({ label, title, description, align = "left" }: SectionHeadingProps) {
  const alignClassName = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55 }}
      className={`flex flex-col gap-4 ${alignClassName}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.36em] text-[#f97316]">{label}</p>
      <h2 className="max-w-4xl text-4xl leading-[0.9] text-black sm:text-5xl lg:text-7xl">{title}</h2>
      <p className="max-w-2xl text-sm leading-7 text-black/65 sm:text-base">{description}</p>
    </motion.div>
  );
}